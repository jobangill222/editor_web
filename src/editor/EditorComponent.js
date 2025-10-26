import React, { useState, useRef, useEffect, useCallback } from "react";
import { Play, Pause, Square } from "lucide-react";
import SpekerSegment from "./SpekerSegment";
import OriginalAudioWaveComponent from "./OriginalAudioWaveComponent";

const EditorComponent = (props) => {
  const { speakerWiseTrack, originalMedia, pixelsPerSecond, showOriginalMedia, totalDuration } = props;

  const [speakerWiseTracks, setSpeakerWiseTracks] = useState(speakerWiseTrack);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration] = useState(totalDuration);

  const originalMediaRef = useRef(null);
  const [isPlayingOriginalMedia, setIsPlayingOriginalMedia] = useState(false);
  const [isDraggingPlayhead, setIsDraggingPlayhead] = useState(false);

  const audioRefs = useRef({});
  const animationFrameRef = useRef(null);
  const startTimeRef = useRef(0);
  const timelineContainerRef = useRef(null);
  const playheadOffsetRef = useRef(0);
  const lastSyncTimeRef = useRef(0);

  // ----------------------------
  // Preload audio instances once
  // ----------------------------
  useEffect(() => {
    const newRefs = {};
    speakerWiseTracks.forEach((speakerTrack) => {
      speakerTrack.segments.forEach((segment) => {
        if (segment.audioUrl) {
          const audio = new Audio(segment.audioUrl);
          audio.preload = "auto";
          newRefs[`${speakerTrack.id}_${segment.id}`] = audio;
        }
      });
    });
    audioRefs.current = newRefs;
    return () => {
      Object.values(newRefs).forEach((audio) => {
        audio.pause();
        audio.src = "";
      });
    };
  }, [speakerWiseTracks]);

  // ----------------------------
  // Auto-scroll timeline as playing
  // ----------------------------
  useEffect(() => {
    if (timelineContainerRef.current && (isPlaying || isDraggingPlayhead)) {
      const container = timelineContainerRef.current;
      const playheadPosition = currentTime * pixelsPerSecond;
      const containerWidth = container.clientWidth;
      const scrollLeft = container.scrollLeft;

      if (playheadPosition > scrollLeft + containerWidth * 0.7) {
        container.scrollTo({
          left: playheadPosition - containerWidth * 0.3,
          behavior: "smooth",
        });
      }
    }
  }, [currentTime, isPlaying, isDraggingPlayhead, pixelsPerSecond]);

  // ----------------------------
  // Stop playback
  // ----------------------------
  const stopPlayback = () => {
    setIsPlaying(false);
    setCurrentTime(0);
    Object.values(audioRefs.current).forEach((audio) => {
      if (audio) {
        audio.pause();
        audio.currentTime = 0;
      }
    });
    startTimeRef.current = 0;
    if (animationFrameRef.current)
      cancelAnimationFrame(animationFrameRef.current);
  };

  // ----------------------------
  // Core playback loop
  // ----------------------------
  const updatePlayback = useCallback(() => {
    const elapsed = (Date.now() - startTimeRef.current) / 1000;
    setCurrentTime(elapsed);

    const now = Date.now();
    const newActiveSegments = [];

    speakerWiseTracks.forEach((speakerTrack) => {
      const activeSegment = speakerTrack.segments.find(
        (s) => elapsed >= s.start && elapsed <= s.end
      );

      if (activeSegment) {
        newActiveSegments.push({
          trackId: speakerTrack.id,
          segmentId: activeSegment.id,
          segment: activeSegment,
        });

        if (activeSegment.audioUrl) {
          const audioKey = `${speakerTrack.id}_${activeSegment.id}`;
          const audio = audioRefs.current[audioKey];
          if (audio) {
            const segmentOffset = elapsed - activeSegment.start;

            if (audio.paused) {
              audio.currentTime = segmentOffset;
              audio.play().catch(() => {});
            } else if (now - lastSyncTimeRef.current > 300) {
              const timeDiff = Math.abs(audio.currentTime - segmentOffset);
              if (timeDiff > 0.15) audio.currentTime = segmentOffset;
              lastSyncTimeRef.current = now;
            }
          }
        }
      } else {
        speakerTrack.segments.forEach((seg) => {
          const key = `${speakerTrack.id}_${seg.id}`;
          const a = audioRefs.current[key];
          if (a && !a.paused) a.pause();
        });
      }
    });

    if (elapsed >= duration) {
      stopPlayback();
      return;
    }

    if (isPlaying)
      animationFrameRef.current = requestAnimationFrame(updatePlayback);
  }, [isPlaying, duration, speakerWiseTracks]);

  // ----------------------------
  // Toggle Play / Pause
  // ----------------------------
  const togglePlayback = () => {
    if (isPlaying) {
      setIsPlaying(false);
      Object.values(audioRefs.current).forEach((a) => a?.pause());
    } else {
      setIsPlaying(true);
      startTimeRef.current = Date.now() - currentTime * 1000;

      speakerWiseTracks.forEach((speakerTrack) => {
        speakerTrack.segments.forEach((segment) => {
          if (segment.audioUrl) {
            const audio = audioRefs.current[`${speakerTrack.id}_${segment.id}`];
            if (audio) {
              const segmentOffset = currentTime - segment.start;
              if (
                segmentOffset >= 0 &&
                segmentOffset <= segment.end - segment.start
              )
                audio.currentTime = segmentOffset;
            }
          }
        });
      });

      updatePlayback();
    }
  };

  const pausePlaying = () => {
    if (isPlaying) togglePlayback();
  }

  // Cleanup animation frame
  useEffect(() => {
    if (isPlaying) {
      startTimeRef.current = Date.now() - currentTime * 1000;
      updatePlayback();
    }
    return () => {
      if (animationFrameRef.current)
        cancelAnimationFrame(animationFrameRef.current);
    };
  }, [isPlaying, updatePlayback]);

  // ----------------------------
  // Playhead Drag Handlers
  // ----------------------------
  const handlePlayheadMouseDown = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingPlayhead(true);

    if (isPlaying) togglePlayback();

    const playheadLeftPx = currentTime * pixelsPerSecond + 132;
    playheadOffsetRef.current = e.clientX - playheadLeftPx;
  };

  const handlePlayheadMouseMove = useCallback(
    (e) => {
      if (isDraggingPlayhead) {
        const containerLeft = 132;
        const newX = e.clientX - playheadOffsetRef.current - containerLeft;
        const newTime = Math.max(0, Math.min(duration, newX / pixelsPerSecond));
        setCurrentTime(newTime);
      }
    },
    [isDraggingPlayhead, duration, pixelsPerSecond]
  );

  const handlePlayheadMouseUp = useCallback(() => {
    if (isDraggingPlayhead) {
      setIsDraggingPlayhead(false);
      playheadOffsetRef.current = 0;
      Object.values(audioRefs.current).forEach((a) => a?.pause());
    }
  }, [isDraggingPlayhead]);

  useEffect(() => {
    if (isDraggingPlayhead) {
      document.addEventListener("mousemove", handlePlayheadMouseMove);
      document.addEventListener("mouseup", handlePlayheadMouseUp);
      return () => {
        document.removeEventListener("mousemove", handlePlayheadMouseMove);
        document.removeEventListener("mouseup", handlePlayheadMouseUp);
      };
    }
  }, [isDraggingPlayhead, handlePlayheadMouseMove, handlePlayheadMouseUp]);

  const formatTime = (timeInSeconds) => {
    if (timeInSeconds == null) return "00:00.00";
    const minutes = Math.floor(timeInSeconds / 60);
    const seconds = timeInSeconds % 60;
    return `${String(minutes).padStart(2, "0")}:${seconds
      .toFixed(2)
      .padStart(5, "0")}`;
  };

  // ----------------------------
  // Render
  // ----------------------------
  return (
    <div
      style={{
        width: "100%",
        height: "100vh",
        backgroundColor: "#111827",
        color: "white",
        padding: "16px",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Playback Controls */}
      <div
        style={{
          marginBottom: "16px",
          alignItems: "center",
          justifyContent: "center",
          display: "flex",
          gap: "8px",
        }}
      >
        <div
          onClick={togglePlayback}
          style={{
            padding: "12px",
            borderRadius: "8px",
            border: "none",
            cursor: "pointer",
          }}
          title="Play/Pause Segmented Tracks"
        >
          {isPlaying ? (
            <Pause size={24} color="white" />
          ) : (
            <Play size={24} color="white" />
          )}
        </div>

        <div
          style={{ fontFamily: "monospace", fontSize: "14px", color: "#fff" }}
        >
          {formatTime(currentTime)} | {formatTime(duration)}
        </div>

        <div
          onClick={stopPlayback}
          style={{
            padding: "12px",
            borderRadius: "8px",
            border: "none",
            cursor: "pointer",
          }}
          title="Stop Segmented Tracks"
        >
          <Square size={24} color="white" />
        </div>
      </div>

      {/* Unified scroll container for all timeline sections */}
      <div
        ref={timelineContainerRef}
        style={{
          backgroundColor: "#1f2937",
          borderRadius: "8px",
          overflowX: "auto",
          overflowY: "hidden",
          flex: 1,
          position: "relative",
          paddingBottom: "40px",
        }}
      >
        <div
          style={{
            position: "relative",
            minWidth: `${duration * pixelsPerSecond + 132}px`,
          }}
        >
          {/* Original waveform */}
          {showOriginalMedia && (
            <div
              style={{
                marginTop: "20px",
                display: "flex",
                gap: "16px",
                marginBottom: "24px",
                alignItems: "center",
              }}
            >
              <div
                style={{
                  width: "116px",
                  flexShrink: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  textAlign: "center",
                }}
              >
                <div
                  onClick={() => {
                    if (!originalMediaRef.current) return;
                    if (originalMediaRef.current.isPlaying()) {
                      originalMediaRef.current.pause();
                      setIsPlayingOriginalMedia(false);
                    } else {
                      originalMediaRef.current.play();
                      setIsPlayingOriginalMedia(true);
                    }
                  }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "6px",
                    padding: "4px 8px",

                    backgroundColor: "transparent", // ✅ no background color
                    color: "#fff", // purple text/icon color
                    cursor: "pointer",
                    fontSize: "14px",
                    fontWeight: "500",
                  }}
                >
                  Original{" "}
                  {isPlayingOriginalMedia ? (
                    <Pause size={15} />
                  ) : (
                    <Play size={15} />
                  )}
                </div>
              </div>

              <div
                className="timeline-clickable"
                style={{
                  position: "relative",
                  height: "64px",
                  backgroundColor: "rgb(211, 243, 229)",
                  borderRadius: "4px",
                  width: `${duration * pixelsPerSecond}px`,
                }}
              >
                
                <OriginalAudioWaveComponent
                  mediaUrl={originalMedia}
                  pixelsPerSecond={pixelsPerSecond}
                  originalMediaRef={originalMediaRef}
                  isPlayingOriginalMedia={isPlayingOriginalMedia}
                  setIsPlayingOriginalMedia={setIsPlayingOriginalMedia}
                  showPlayPauseButton={false}
                />
              </div>
            </div>
          )}

          {/* Time ruler */}
          <div style={{ display: "flex", gap: "16px", marginBottom: "16px" }}>
            <div style={{ width: "116px", flexShrink: 0 }} />
            <div
              style={{
                position: "relative",
                width: `${duration * pixelsPerSecond}px`,
              }}
            >
              <div
                style={{
                  position: "relative",
                  height: "30px",
                  userSelect: "none",
                }}
              >
                {Array.from({ length: duration + 1 }, (_, i) => {
                  const isMajor = i % 5 === 0;
                  return (
                    <div
                      key={i}
                      style={{
                        position: "absolute",
                        left: `${i * pixelsPerSecond}px`,
                        bottom: 0,
                        height: isMajor ? "14px" : "6px",
                        width: "1px",
                        backgroundColor: "#9ca3af",
                      }}
                    >
                      {isMajor && (
                        <div
                          style={{
                            position: "absolute",
                            bottom: "100%",
                            marginBottom: "4px",
                            left: "50%",
                            transform: "translateX(-50%)",
                            fontSize: "12px",
                            color: "#9ca3af",
                          }}
                        >
                          0:{String(i).padStart(2, "0")}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Speaker Tracks */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "16px",
              marginTop: "10px",
              marginBottom: "10px",
            }}
          >
            {speakerWiseTracks.map((speakerTrack) => (
              <div
                key={speakerTrack.id}
                style={{ display: "flex", gap: "16px", alignItems: "center" }}
              >
                <div style={{ width: "116px", flexShrink: 0 }}>
                  <div
                    style={{
                      fontSize: "14px",
                      fontWeight: "500",
                      marginLeft: "20px",
                    }}
                  >
                    {speakerTrack?.speakerName}
                  </div>
                </div>

                <div
                  style={{
                    position: "relative",
                    height: "64px",
                    backgroundColor: "#374151",
                    borderRadius: "4px",
                    width: `${duration * pixelsPerSecond}px`,
                  }}
                >
                  {Array.from(
                    { length: Math.floor(duration / 5) + 1 },
                    (_, i) => (
                      <div
                        key={i}
                        style={{
                          position: "absolute",
                          left: `${i * 5 * pixelsPerSecond}px`,
                          top: 0,
                          width: "1px",
                          height: "100%",
                          backgroundColor: "rgb(147 129 129 / 30%)",
                          pointerEvents: "none",
                        }}
                      />
                    )
                  )}

                  <SpekerSegment
                    speakerSegments={speakerTrack?.segments}
                    pausePlaying={pausePlaying}
                    onSegmentTimeChange={(updatedSegments) => {
                      setSpeakerWiseTracks((prevTracks) =>
                        prevTracks.map((t) =>
                          t.id === speakerTrack.id
                            ? { ...t, segments: updatedSegments }
                            : t
                        )
                      );
                    }}
                    onSegmentSplit={(oldSegmentId, newSegments) => {
                      setSpeakerWiseTracks((prevTracks) =>
                        prevTracks.map((t) =>
                          t.id === speakerTrack.id
                            ? {
                                ...t,
                                segments: t.segments
                                  .filter((seg) => seg.id !== oldSegmentId)
                                  .concat(newSegments)
                                  .sort((a, b) => a.start - b.start),
                              }
                            : t
                        )
                      );
                    }}
                    onDeleteSegment={(oldSegmentId) => {
                      setSpeakerWiseTracks((prevTracks) =>
                        prevTracks.map((t) =>
                          t.id === speakerTrack.id
                            ? {
                                ...t,
                                segments: t.segments
                                  .filter((seg) => seg.id !== oldSegmentId)
                              }
                            : t
                        )
                      );
                    }}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Playhead */}
          <div
            style={{
              position: "absolute",
              top: 0,
              left: `${currentTime * pixelsPerSecond + 132}px`,
              width: "2px",
              height: "100%",
              backgroundColor: "#3b82f6",
              cursor: isDraggingPlayhead ? "grabbing" : "ew-resize",
              zIndex: 20,
              boxShadow: "0 0 10px rgba(59, 130, 246, 0.5)",
            }}
            onMouseDown={handlePlayheadMouseDown}
          >
            <div
              style={{
                position: "absolute",
                top: "-4px",
                left: "-7px",
                width: "16px",
                height: "16px",
                backgroundColor: "#3b82f6",
                borderRadius: "50%",
                border: "2px solid white",
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default EditorComponent;
