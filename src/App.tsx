import React, { useEffect, useRef, useState } from "react";

import bg from "/bg.png";
import clsx from "clsx";
import PauseIcon from "./icons/PauseIcon";
import PlayIcon from "./icons/PlayIcon";
import FishMassive from "./fishMassive";

interface SpawnedFish {
  id: number;
  fishType: number;
  startPosition: number;
  endPosition: number;
  scale: number;
  x: number;
  speed: number;
  currentY?: number;
}

interface Player {
  name: string;
  points: number;
}

function App() {
  const [name, setName] = useState<string>("");
  const [time, setTime] = useState<string>("");
  const [timeError, setTimeError] = useState<string>("");
  const [isPlaying, setIsPlaying] = useState(false);
  const [remainingTime, setRemainingTime] = useState<number>(0);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [points, setPoints] = useState(0);
  const [fish, setFish] = useState<SpawnedFish[]>([]);
  const [players, setPlayers] = useState<Player[]>(() => {
    const savedPlayers = localStorage.getItem("leaderBoard");
    return savedPlayers ? JSON.parse(savedPlayers) : [];
  });
  const [showGameEnd, setShowGameEnd] = useState(false);

  const timerRef = useRef<number | null>(null);
  const aquariumRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<number>(null);

  const nameHandler = (name: string) => {
    setName(name);
  };

  const timeHandler = (time: string) => {
    const [minutesStr, secondsStr] = time.split(":");
    const minutes = Number(minutesStr);
    const seconds = Number(secondsStr);
    if (!/^\d{2}:\d{2}$/.test(time)) {
      setTimeError("Введите время в формате ММ:СС");
    } else if (minutes < 0 || minutes > 59) {
      setTimeError("Минуты должны быть от 00 до 59");
    } else if (seconds < 0 || seconds > 59) {
      setTimeError("Секунды должны быть от 00 до 59");
    } else {
      setTimeError("");
    }
    setTime(time);
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
      .toString()
      .padStart(2, "0");
    const secs = (seconds % 60).toString().padStart(2, "0");
    return `${mins}:${secs}`;
  };

  useEffect(() => {
    const savedGame = localStorage.getItem("currentGame");
    if (savedGame) {
      try {
        const { username, timeLeft, initialTime, isPlaying, points, fish } =
          JSON.parse(savedGame);
        if (username) setName(username);
        if (initialTime) setTime(initialTime);
        if (points) setPoints(points);
        if (fish) setFish(JSON.parse(fish));
        if (timeLeft !== undefined) {
          setRemainingTime(timeLeft);
          if (timeLeft > 0 && isPlaying) {
            setIsPlaying(true);
          }
        }
      } catch (e) {
        console.error("Ошибка", e);
      }
    }
    setIsInitialLoad(false);
    const leaderBoard = localStorage.getItem("leaderBoard");
    if (!leaderBoard) {
      localStorage.setItem(
        "leaderBoard",
        JSON.stringify([{ name: "", points: 0 }])
      );
    }
  }, []);

  useEffect(() => {
    if (isInitialLoad) return;

    if (remainingTime === 0) {
      setIsPlaying(false);
      setShowGameEnd(true);
    } else {
      localStorage.setItem(
        "currentGame",
        JSON.stringify({
          username: name,
          timeLeft: remainingTime,
          initialTime: time,
          points: points,
          fish: JSON.stringify(fish),
          isPlaying,
        })
      );
    }

    if (players) {
      if (players.length === 0) {
        setPlayers([{ name, points }]);
      } else {
        const playerExists = players.find((player) => player.name === name);
        if (playerExists) {
          const updatedPlayers = players.map((player) =>
            player.name === name ? { ...player, points } : player
          );
          if (points > playerExists.points) setPlayers(updatedPlayers);
        } else {
          setPlayers([...players, { name, points }]);
        }
      }
    } else {
      setPlayers([{ name, points }]);
    }
  }, [remainingTime]);

  useEffect(() => {
    if (isPlaying && remainingTime > 0) {
      timerRef.current = window.setInterval(() => {
        setRemainingTime((prev) => {
          if (prev <= 1) {
            window.clearInterval(timerRef.current as number);
            setIsPlaying(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else if (timerRef.current) {
      window.clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) {
        window.clearInterval(timerRef.current);
      }
    };
  }, [isPlaying, remainingTime]);

  const playGameHandler = () => {
    if (!timeError && time && name) {
      const [minutes, seconds] = time.split(":").map(Number);
      const totalSeconds = minutes * 60 + seconds;
      setRemainingTime(totalSeconds);
      setPoints(0);
      setIsPlaying(true);
      setShowGameEnd(false);
    }
  };

  const togglePause = () => {
    setIsPlaying(!isPlaying);
  };

  useEffect(() => {
    if (!isPlaying) return;

    const spawnFish = () => {
      setFish((prev) => {
        if (!aquariumRef.current || prev.length >= 20) return prev;

        const { height } = aquariumRef.current.getBoundingClientRect();
        return [
          ...prev,
          {
            id: Date.now() + Math.random(),
            fishType: Math.floor(Math.random() * FishMassive.length),
            startPosition: Math.random() * (height - 110),
            endPosition: Math.random() * (height - 110),
            scale: getRandomScale(),
            x: 0,
            speed: 1 + Math.random() * 2,
          },
        ];
      });
    };

    const interval = setInterval(spawnFish, 300);
    return () => clearInterval(interval);
  }, [isPlaying]);

  useEffect(() => {
    if (!isPlaying || !aquariumRef.current) return;

    const animate = () => {
      setFish((prevFishes) => {
        const aquariumWidth = aquariumRef.current?.offsetWidth || 0;
        let pointsToSubtract = 0;

        const updatedFishes = prevFishes
          .map((fish) => {
            if (fish.x >= aquariumWidth - 80) {
              pointsToSubtract += Math.floor(5 * fish.speed);
              return null;
            }
            const verticalMovement = Math.sin(fish.x * 0.01) * 40;

            return {
              ...fish,
              x: fish.x + fish.speed,
              currentY: fish.startPosition + verticalMovement,
            };
          })
          .filter(Boolean) as SpawnedFish[];

        if (pointsToSubtract > 0) {
          setPoints((prev) => Math.max(0, prev - pointsToSubtract));
        }
        return updatedFishes;
      });
      animationRef.current = requestAnimationFrame(animate);
    };
    animationRef.current = requestAnimationFrame(animate);
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isPlaying]);

  const closeGameHandler = () => {
    localStorage.setItem("leaderBoard", JSON.stringify(players));
    setShowGameEnd(false);
    localStorage.removeItem("currentGame");
  };

  function getRandomScale() {
    const min = 0.5;
    const max = 2;
    const step = 0.2;
    const steps = (max - min) / step + 1;
    const randomIndex = Math.floor(Math.random() * steps);
    return min + randomIndex * step;
  }

  const catchFishHandler = (fish: SpawnedFish) => {
    if (isPlaying) {
      setFish((prevFish) => prevFish.filter((item) => item.id !== fish.id));
      const pointsByFish = Math.floor((10 * fish.speed) / fish.scale);
      setPoints((prevPoints) => prevPoints + pointsByFish);
    }
  };

  return (
    <>
      <div className="absolute flex items-center justify-center size-full">
        <img className="absolute z-0 size-full" src={bg} alt="" />
        {!isPlaying && remainingTime === 0 && !showGameEnd && (
          <div className="z-10 flex flex-col items-center gap-[10px]">
            <p className="text-[80px]">РЫБКИ</p>
            <div>
              <p className="text-[30px] font-semibold text-[#20176A]">ИМЯ</p>
              <input
                className="border-2 text-[30px] rounded-[10px] p-[5px]"
                placeholder="Введите имя"
                type="text"
                onChange={(e) => nameHandler(e.target.value)}
                value={name}
              />
            </div>
            <div>
              <p className="text-[30px] font-semibold text-[#20176A]">ВРЕМЯ</p>
              {timeError && (
                <p className="text-[20px] whitespace-normal break-normal font-semibold text-[#EA2020]">
                  {timeError}
                </p>
              )}
              <input
                className="border-2 text-[30px] rounded-[10px] p-[5px]"
                placeholder="Введите время"
                type="text"
                value={time}
                onChange={(e) => timeHandler(e.target.value)}
              />
            </div>
            <button
              disabled={!time || !name || !!timeError}
              className={clsx(
                "border-2 w-full rounded-[10px] p-[5px] text-[30px] font-semibold text-[#20176A]",
                !!time && !!name && !timeError
                  ? "cursor-pointer"
                  : "bg-gray-400 cursor-default"
              )}
              onClick={playGameHandler}
            >
              ИГРАТЬ
            </button>
            <div className="w-full flex flex-col items-center max-h-[500px] overflow-y-auto">
              <p className="text-[50px] font-semibold">LEADERBOARD</p>
              <div className="text-[30px] font-semibold flex gap-[20px]">
                <p>ИМЯ</p>
                <p>ОЧКИ</p>
              </div>
              {players
                .sort((a, b) => b.points - a.points)
                .map((player) => (
                  <div
                    key={player.name}
                    className="text-[30px] flex gap-[10px] justify-center gap-[20px]"
                  >
                    <p className="text-[#20176A] font-semibold">
                      {player.name}
                    </p>
                    <p className="text-[#20176A] font-semibold">
                      {player.points}
                    </p>
                  </div>
                ))}
            </div>
          </div>
        )}
        {(isPlaying || remainingTime > 0) && (
          <div className="flex flex-col size-3/4 z-10 items-center justify-center">
            <div className="z-10   flex-col flex items-center justify-center w-1/2 h-1/4">
              <div className="flex gap-[40px] items-center justify-center">
                <p className="text-[100px] font-semibold text-[#20176A] font-semibold">
                  {formatTime(remainingTime)}
                </p>
                <button
                  onClick={togglePause}
                  className="border-2 border-[#20176A] rounded-[10px] p-[10px] cursor-pointer"
                >
                  {isPlaying ? (
                    <PauseIcon className="size-[100px] fill-[#20176A]" />
                  ) : (
                    <PlayIcon className="size-[100px] fill-[#20176A]" />
                  )}
                </button>
              </div>
              <div className="flex gap-[20px] text-[50px] font-semibold text-[#20176A] font-semibold">
                <p>ОЧКИ</p>
                {points}
              </div>
            </div>
            <div ref={aquariumRef} className="size-2/3  relative border-6 z-10">
              {fish.map((fish) => (
                <div
                  key={fish.id}
                  className="absolute cursor-pointer"
                  style={{
                    left: `${fish.x}px`,
                    top: `${fish.currentY || fish.startPosition}px`, // Используем currentY если есть, иначе startPosition
                    transform: `scale(${fish.scale})`,
                  }}
                  onMouseDown={() => catchFishHandler(fish)}
                >
                  {FishMassive[fish.fishType]}
                </div>
              ))}
            </div>
          </div>
        )}
        {showGameEnd && (
          <div className="size-3/4 flex flex-col items-center z-10">
            {<p className="text-[50px] font-semibold">{name}</p>}
            <p className="text-[50px] font-semibold">ТВОЯ ИГРА ОКОНЧЕНА</p>
            <p className="text-[50px] font-semibold">ВАШИ ОЧКИ </p>
            <p className="text-[150px] font-semibold text-[#20176A]">
              {points}
            </p>
            <div className="flex w-full flex-col gap-[20px] items-center">
              <button
                className="border-2 w-1/2 rounded-[10px] p-[5px] text-[30px] font-semibold text-[#20176A] cursor-pointer"
                onClick={playGameHandler}
              >
                ИГРАТЬ ЕЩЕ
              </button>
              <button
                className="border-2 w-1/2 rounded-[10px] p-[5px] text-[30px] font-semibold text-[#20176A] cursor-pointer"
                onClick={closeGameHandler}
              >
                ЗАКРЫТЬ
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

export default App;
