/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  Board,
  GameMode,
  GameSettings,
  GameStatus,
  Move,
  PieceColor,
  Position,
  GameHistoryEntry,
  GameVariant,
} from './types';
import {
  createInitialBoard,
  getAllLegalMoves,
  getLegalMovesForPosition,
  applyMove,
  countPieces,
  checkGameStatus,
  cloneBoard,
} from './utils/checkersLogic';
import { getAiTurnMoves } from './utils/aiEngine';
import { sound } from './utils/audio';
import { HomeScreen } from './components/HomeScreen';
import { CheckersBoard } from './components/CheckersBoard';
import { ScoreBoard } from './components/ScoreBoard';
import { GameControls } from './components/GameControls';
import { GameOverModal } from './components/GameOverModal';
import { HowToPlayModal } from './components/HowToPlayModal';
import { SettingsModal } from './components/SettingsModal';
import { useOnlineGame } from './utils/useOnlineGame';
import { OnlineLobbyModal } from './components/OnlineLobbyModal';
import { OnlineGameBar } from './components/OnlineGameBar';

const DEFAULT_SETTINGS: GameSettings = {
  soundEnabled: true,
  hapticsEnabled: true,
  theme: 'walnut',
  difficulty: 'medium',
  playerColor: 'red',
  variant: 'turkish',
};

export default function App() {
  // Screen & Navigation
  const [screen, setScreen] = useState<'home' | 'game'>('home');
  const [gameMode, setGameMode] = useState<GameMode>('ai');

  // Modals
  const [isRulesOpen, setIsRulesOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isOnlineLobbyOpen, setIsOnlineLobbyOpen] = useState(false);

  // Online Multiplayer Hook
  const online = useOnlineGame();

  // Settings
  const [settings, setSettings] = useState<GameSettings>(() => {
    try {
      const saved = localStorage.getItem('dama_settings');
      return saved ? { ...DEFAULT_SETTINGS, ...JSON.parse(saved) } : DEFAULT_SETTINGS;
    } catch {
      return DEFAULT_SETTINGS;
    }
  });

  // Core Game State
  const [board, setBoard] = useState<Board>(() => createInitialBoard(settings.variant));
  const [currentTurn, setCurrentTurn] = useState<PieceColor>('red');
  const [selectedPos, setSelectedPos] = useState<Position | null>(null);
  const [multiJumpPiecePos, setMultiJumpPiecePos] = useState<Position | null>(null);
  const [lastMove, setLastMove] = useState<{ from: Position; to: Position } | null>(null);
  const [history, setHistory] = useState<GameHistoryEntry[]>([]);
  const [status, setStatus] = useState<GameStatus>('playing');
  const [isAiThinking, setIsAiThinking] = useState<boolean>(false);
  const [moveCount, setMoveCount] = useState<number>(0);

  // Switch to game screen when room is joined
  useEffect(() => {
    if (online.roomState) {
      setGameMode('online');
      setScreen('game');
      setIsOnlineLobbyOpen(false);
      setSelectedPos(null);
    }
  }, [online.roomState]);

  // Audio trigger on opponent's online move or game end
  const prevOnlineMoveCountRef = useRef(0);
  useEffect(() => {
    if (gameMode === 'online' && online.roomState) {
      if (online.roomState.moveCount > prevOnlineMoveCountRef.current) {
        sound.playWoodMove();
      }
      prevOnlineMoveCountRef.current = online.roomState.moveCount;

      if (online.roomState.status !== 'playing') {
        sound.playVictory();
      }
    }
  }, [gameMode, online.roomState]);

  // Active state selectors (delegating to online state if in online game)
  const isOnline = gameMode === 'online' && Boolean(online.roomState);
  const activeBoard = isOnline ? online.roomState!.board : board;
  const activeTurn = isOnline ? online.roomState!.currentTurn : currentTurn;
  const activeVariant = isOnline ? online.roomState!.variant : settings.variant;
  const activeStatus = isOnline ? online.roomState!.status : status;
  const activeMultiJump = isOnline ? online.roomState!.multiJumpPiecePos : multiJumpPiecePos;
  const activeLastMove = isOnline ? online.roomState!.lastMove : lastMove;
  const activeMoveCount = isOnline ? online.roomState!.moveCount : moveCount;

  const isMyOnlineTurn =
    isOnline &&
    ((online.myColor === 'red' && activeTurn === 'red') ||
      (online.myColor === 'black' && activeTurn === 'black'));

  // Update audio engine volume based on settings
  useEffect(() => {
    sound.setEnabled(settings.soundEnabled);
  }, [settings.soundEnabled]);

  const updateSettings = (newSettings: Partial<GameSettings>) => {
    setSettings((prev) => {
      const updated = { ...prev, ...newSettings };
      try {
        localStorage.setItem('dama_settings', JSON.stringify(updated));
      } catch {
        // LocalStorage fallback
      }

      // If game variant has changed, automatically initialize the new board setup
      if (newSettings.variant && newSettings.variant !== prev.variant) {
        setBoard(createInitialBoard(newSettings.variant));
        setCurrentTurn('red');
        setSelectedPos(null);
        setMultiJumpPiecePos(null);
        setLastMove(null);
        setHistory([]);
        setStatus('playing');
        setIsAiThinking(false);
        setMoveCount(0);
      }

      return updated;
    });
  };

  const handleToggleVariant = () => {
    if (isOnline) return;
    const nextVariant: GameVariant = settings.variant === 'turkish' ? 'diagonal' : 'turkish';
    updateSettings({ variant: nextVariant });
    sound.playSelect();
  };

  const triggerHaptic = useCallback(
    (pattern: number | number[]) => {
      if (settings.hapticsEnabled && typeof navigator !== 'undefined' && navigator.vibrate) {
        try {
          navigator.vibrate(pattern);
        } catch {
          // Vibrator error ignored
        }
      }
    },
    [settings.hapticsEnabled]
  );

  // Piece counts
  const totalPiecesPerPlayer = activeVariant === 'turkish' ? 16 : 12;
  const pieceCounts = useMemo(() => countPieces(activeBoard), [activeBoard]);
  const capturedByRed = Math.max(0, totalPiecesPerPlayer - pieceCounts.blackPieces);
  const capturedByBlack = Math.max(0, totalPiecesPerPlayer - pieceCounts.redPieces);

  // Determine if it's the AI's turn
  const isAiTurn =
    gameMode === 'ai' &&
    ((settings.playerColor === 'red' && currentTurn === 'black') ||
      (settings.playerColor === 'black' && currentTurn === 'red'));

  // Calculate all legal moves for current turn
  const currentLegalMoves = useMemo(() => {
    if (activeStatus !== 'playing') return [];
    return getAllLegalMoves(activeBoard, activeTurn, activeMultiJump, activeVariant);
  }, [activeBoard, activeTurn, activeMultiJump, activeStatus, activeVariant]);

  // Mandatory capture active flag
  const isMandatoryCaptureActive = useMemo(() => {
    return currentLegalMoves.some((m) => Boolean(m.captured));
  }, [currentLegalMoves]);

  // Positions of pieces that can currently make a move
  const selectablePositions = useMemo(() => {
    if (activeStatus !== 'playing') return [];
    if (gameMode === 'ai' && isAiTurn) return [];
    if (isOnline && !isMyOnlineTurn) return [];
    if (activeMultiJump) return [activeMultiJump];

    const uniquePosMap = new Map<string, Position>();
    currentLegalMoves.forEach((m) => {
      const key = `${m.from.row},${m.from.col}`;
      if (!uniquePosMap.has(key)) {
        uniquePosMap.set(key, m.from);
      }
    });
    return Array.from(uniquePosMap.values());
  }, [currentLegalMoves, isAiTurn, activeMultiJump, activeStatus, gameMode, isOnline, isMyOnlineTurn]);

  // Legal moves specifically for the currently selected piece
  const legalMovesForSelected = useMemo(() => {
    if (!selectedPos || activeStatus !== 'playing') return [];
    if (gameMode === 'ai' && isAiTurn) return [];
    if (isOnline && !isMyOnlineTurn) return [];
    return getLegalMovesForPosition(activeBoard, selectedPos, activeTurn, activeMultiJump, activeVariant);
  }, [activeBoard, selectedPos, activeTurn, activeMultiJump, isAiTurn, activeStatus, activeVariant, gameMode, isOnline, isMyOnlineTurn]);

  // Start fresh game
  const handleStartGame = (mode: GameMode) => {
    setGameMode(mode);
    setBoard(createInitialBoard(settings.variant));
    setCurrentTurn('red');
    setSelectedPos(null);
    setMultiJumpPiecePos(null);
    setLastMove(null);
    setHistory([]);
    setStatus('playing');
    setIsAiThinking(false);
    setMoveCount(0);
    setScreen('game');
    sound.playSelect();
  };

  // Restart current match
  const handleRestart = () => {
    if (isOnline) {
      online.requestRematch();
      return;
    }
    setBoard(createInitialBoard(settings.variant));
    setCurrentTurn('red');
    setSelectedPos(null);
    setMultiJumpPiecePos(null);
    setLastMove(null);
    setHistory([]);
    setStatus('playing');
    setIsAiThinking(false);
    setMoveCount(0);
    sound.playSelect();
  };

  // Exit back to Home Screen
  const handleExitToHome = () => {
    if (isOnline) {
      online.leaveRoom();
    }
    setScreen('home');
    setGameMode('ai');
    setStatus('playing');
    setBoard(createInitialBoard(settings.variant));
    setCurrentTurn('red');
    setSelectedPos(null);
    setMultiJumpPiecePos(null);
    setLastMove(null);
    setHistory([]);
    setIsAiThinking(false);
    setMoveCount(0);
    sound.playSelect();
  };

  // Undo Move handler
  const handleUndo = () => {
    if (isOnline || history.length === 0 || isAiThinking) return;

    if (gameMode === 'ai') {
      let targetIndex = history.length - 1;
      if (history.length >= 2) {
        targetIndex = history.length - 2;
      } else {
        targetIndex = 0;
      }

      const prevEntry = history[targetIndex];
      setBoard(prevEntry.board);
      setCurrentTurn(prevEntry.turn);
      setLastMove(prevEntry.lastMove || null);
      setHistory((prev) => prev.slice(0, targetIndex));
      setSelectedPos(null);
      setMultiJumpPiecePos(null);
      setStatus('playing');
      sound.playSelect();
    } else {
      const prevEntry = history[history.length - 1];
      setBoard(prevEntry.board);
      setCurrentTurn(prevEntry.turn);
      setLastMove(prevEntry.lastMove || null);
      setHistory((prev) => prev.slice(0, -1));
      setSelectedPos(null);
      setMultiJumpPiecePos(null);
      setStatus('playing');
      sound.playSelect();
    }
  };

  // Execute Move
  const executePlayerMove = useCallback(
    (move: Move) => {
      // Save current state to history for undo
      setHistory((prev) => [
        ...prev,
        {
          board: cloneBoard(board),
          turn: currentTurn,
          capturedByRed,
          capturedByBlack,
          lastMove: lastMove || undefined,
        },
      ]);

      const { newBoard, promotedToKing, hasFurtherJumps } = applyMove(board, move, settings.variant);
      setBoard(newBoard);
      setLastMove({ from: move.from, to: move.to });
      setMoveCount((prev) => prev + 1);

      // Play appropriate sound & haptics
      if (promotedToKing) {
        sound.playKingPromotion();
        triggerHaptic([30, 40, 60]);
      } else if (move.captured) {
        sound.playWoodCapture();
        triggerHaptic(40);
      } else {
        sound.playWoodMove();
        triggerHaptic(15);
      }

      // Check if current piece has chained multi-jumps
      if (hasFurtherJumps) {
        setMultiJumpPiecePos(move.to);
        setSelectedPos(move.to);
      } else {
        setMultiJumpPiecePos(null);
        setSelectedPos(null);
        const nextTurn: PieceColor = currentTurn === 'red' ? 'black' : 'red';
        setCurrentTurn(nextTurn);

        // Check if game has ended
        const newStatus = checkGameStatus(newBoard, nextTurn, null, settings.variant);
        setStatus(newStatus);
        if (newStatus !== 'playing') {
          sound.playVictory();
          triggerHaptic([50, 100, 150]);
        }
      }
    },
    [board, currentTurn, capturedByRed, capturedByBlack, lastMove, triggerHaptic, settings.variant]
  );

  // Click handler on squares
  const handleSquareClick = (row: number, col: number) => {
    if (activeStatus !== 'playing') return;
    if (gameMode === 'ai' && (isAiTurn || isAiThinking)) return;
    if (isOnline && !isMyOnlineTurn) return;

    // Check if clicking on a legal destination for the currently selected piece
    if (selectedPos) {
      const destinationMove = legalMovesForSelected.find(
        (m) => m.to.row === row && m.to.col === col
      );

      if (destinationMove) {
        if (isOnline) {
          online.makeMove(destinationMove);
          setSelectedPos(null);
          if (destinationMove.captured) {
            sound.playWoodCapture();
          } else {
            sound.playWoodMove();
          }
          return;
        }

        executePlayerMove(destinationMove);
        return;
      }
    }

    // If active in multi-jump sequence, the player cannot select other pieces!
    if (activeMultiJump) {
      return;
    }

    // Check if clicking on a selectable piece of player's color
    const clickedPiece = activeBoard[row][col];
    if (clickedPiece && clickedPiece.color === activeTurn) {
      if (isOnline && clickedPiece.color !== online.myColor) {
        return;
      }

      const isPieceSelectable = selectablePositions.some(
        (p) => p.row === row && p.col === col
      );

      if (isPieceSelectable) {
        if (selectedPos?.row === row && selectedPos?.col === col) {
          setSelectedPos(null);
        } else {
          setSelectedPos({ row, col });
          sound.playSelect();
          triggerHaptic(15);
        }
      }
    } else {
      if (selectedPos) {
        setSelectedPos(null);
      }
    }
  };

  // AI Turn Handling
  useEffect(() => {
    if (status !== 'playing' || !isAiTurn || screen !== 'game' || gameMode !== 'ai') return;

    setIsAiThinking(true);

    const timer = setTimeout(() => {
      const aiMoves = getAiTurnMoves(board, currentTurn, settings.difficulty, settings.variant);

      if (aiMoves.length === 0) {
        const winningColor: PieceColor = currentTurn === 'red' ? 'black' : 'red';
        setStatus(winningColor === 'red' ? 'red_won' : 'black_won');
        sound.playVictory();
        setIsAiThinking(false);
        return;
      }

      const move = aiMoves[0];

      // Save state to history for undo
      setHistory((prev) => [
        ...prev,
        {
          board: cloneBoard(board),
          turn: currentTurn,
          capturedByRed,
          capturedByBlack,
          lastMove: lastMove || undefined,
        },
      ]);

      const { newBoard, promotedToKing, hasFurtherJumps } = applyMove(board, move, settings.variant);
      setBoard(newBoard);
      setLastMove({ from: move.from, to: move.to });
      setMoveCount((prev) => prev + 1);

      if (promotedToKing) {
        sound.playKingPromotion();
      } else if (move.captured) {
        sound.playWoodCapture();
      } else {
        sound.playWoodMove();
      }

      if (hasFurtherJumps) {
        setMultiJumpPiecePos(move.to);
        setIsAiThinking(false);
      } else {
        setMultiJumpPiecePos(null);
        const nextTurn: PieceColor = currentTurn === 'red' ? 'black' : 'red';
        setCurrentTurn(nextTurn);
        const newStatus = checkGameStatus(newBoard, nextTurn, null, settings.variant);
        setStatus(newStatus);
        if (newStatus !== 'playing') {
          sound.playVictory();
        }
        setIsAiThinking(false);
      }
    }, 550);

    return () => clearTimeout(timer);
  }, [
    isAiTurn,
    currentTurn,
    board,
    status,
    screen,
    settings.difficulty,
    settings.variant,
    capturedByRed,
    capturedByBlack,
    lastMove,
    multiJumpPiecePos,
  ]);

  return (
    <div className="min-h-[100dvh] w-full bg-[#101114] text-zinc-100 flex flex-col justify-between overflow-hidden relative select-none">
      {/* View routing: Home or Active Game */}
      {screen === 'home' ? (
        <HomeScreen
          onStartGame={handleStartGame}
          onOpenOnlineLobby={() => setIsOnlineLobbyOpen(true)}
          onOpenRules={() => setIsRulesOpen(true)}
          onOpenSettings={() => setIsSettingsOpen(true)}
          settings={settings}
          onUpdateSettings={updateSettings}
        />
      ) : (
        <div className="h-[100dvh] w-full flex flex-col justify-between py-1 sm:py-2 px-2 overflow-hidden max-w-lg mx-auto">
          {/* Top Status & Scoreboard */}
          <div className="w-full shrink-0 space-y-1">
            <ScoreBoard
              currentTurn={activeTurn}
              gameMode={gameMode}
              difficulty={settings.difficulty}
              isAiThinking={isAiThinking}
              playerColor={isOnline && online.myColor && online.myColor !== 'spectator' ? online.myColor : settings.playerColor}
              redPieces={pieceCounts.redPieces}
              redKings={pieceCounts.redKings}
              blackPieces={pieceCounts.blackPieces}
              blackKings={pieceCounts.blackKings}
              capturedByRed={capturedByRed}
              capturedByBlack={capturedByBlack}
              isMandatoryCaptureActive={isMandatoryCaptureActive}
              variant={activeVariant}
              onToggleVariant={handleToggleVariant}
              onExitToHome={handleExitToHome}
              customRedName={
                isOnline && online.roomState?.players.red
                  ? `${online.roomState.players.red.name}${online.myColor === 'red' ? ' (Siz)' : ''}`
                  : undefined
              }
              customBlackName={
                isOnline && online.roomState?.players.black
                  ? `${online.roomState.players.black.name}${online.myColor === 'black' ? ' (Siz)' : ''}`
                  : undefined
              }
            />

            {/* Online In-Game Ribbon (Room Code, Share, Resign, Draw, Chat) */}
            {isOnline && online.roomState && (
              <OnlineGameBar
                roomState={online.roomState}
                myColor={online.myColor}
                onSendChat={online.sendChat}
                onResign={online.resign}
                onOfferDraw={online.offerDraw}
                onRespondDraw={online.respondDraw}
                onRequestRematch={online.requestRematch}
                onExit={handleExitToHome}
              />
            )}
          </div>

          {/* Centered Wooden Checkers Board */}
          <div className="flex-1 flex items-center justify-center min-h-0 py-1">
            <CheckersBoard
              board={activeBoard}
              currentTurn={activeTurn}
              theme={settings.theme}
              selectedPos={selectedPos}
              legalMovesForSelected={legalMovesForSelected}
              selectablePositions={selectablePositions}
              multiJumpPiecePos={activeMultiJump}
              lastMove={activeLastMove}
              onSquareClick={handleSquareClick}
              isAiTurn={isAiTurn}
              flipped={isOnline && online.myColor === 'black'}
            />
          </div>

          {/* Bottom Game Controls */}
          <div className="w-full shrink-0 pb-1">
            <GameControls
              canUndo={!isOnline && history.length > 0 && !isAiThinking && activeStatus === 'playing'}
              onUndo={handleUndo}
              onRestart={handleRestart}
              onExit={handleExitToHome}
              soundEnabled={settings.soundEnabled}
              onToggleSound={() =>
                updateSettings({ soundEnabled: !settings.soundEnabled })
              }
              onOpenSettings={() => setIsSettingsOpen(true)}
              onOpenRules={() => setIsRulesOpen(true)}
            />
          </div>
        </div>
      )}

      {/* Result Screen / Winner Modal */}
      {screen === 'game' && (
        <GameOverModal
          status={activeStatus}
          gameMode={gameMode}
          playerColor={isOnline && online.myColor && online.myColor !== 'spectator' ? online.myColor : settings.playerColor}
          moveCount={activeMoveCount}
          capturedByRed={capturedByRed}
          capturedByBlack={capturedByBlack}
          onPlayAgain={handleRestart}
          onExitToMenu={handleExitToHome}
          variant={activeVariant}
        />
      )}

      {/* Online Lobby Modal */}
      <OnlineLobbyModal
        isOpen={isOnlineLobbyOpen}
        onClose={() => setIsOnlineLobbyOpen(false)}
        isConnected={online.isConnected}
        activeRooms={online.activeRooms}
        isLoadingRooms={online.isLoadingRooms}
        onRefreshRooms={online.fetchActiveRooms}
        onCreateRoom={online.createRoom}
        onQuickMatch={online.quickMatch}
        onJoinRoom={online.joinRoom}
        defaultVariant={settings.variant}
        errorMessage={online.error}
      />

      {/* How to Play Rules Modal */}
      <HowToPlayModal
        isOpen={isRulesOpen}
        onClose={() => setIsRulesOpen(false)}
        initialVariant={activeVariant}
      />

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onUpdateSettings={updateSettings}
      />
    </div>
  );
}
