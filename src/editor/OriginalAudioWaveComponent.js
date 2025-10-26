import WaveSurfer from "wavesurfer.js";
import { useEffect, useRef, useState } from "react";

const OriginalAudioWaveComponent = ({
  mediaUrl,
  pixelsPerSecond,
  originalMediaRef,
  isPlayingOriginalMedia,
  setIsPlayingOriginalMedia,
  showPlayPauseButton,
}) => {
  const containerRef = useRef(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (!containerRef.current) return;

    if (originalMediaRef.current) originalMediaRef.current.destroy();

    const ext = mediaUrl.split(".").pop().toLowerCase();
    const mediaElement =
      ext === "mp4"
        ? document.createElement("video")
        : document.createElement("audio");
    mediaElement.src = mediaUrl;
    mediaElement.crossOrigin = "anonymous";
    mediaElement.controls = false;

    const ws = WaveSurfer.create({
      container: containerRef.current,
      waveColor:"#00D282",
      progressColor:"#00D282",
      cursorColor: "grey",
      height: 60,
      barWidth: 2,
      normalize: true,
      interact: false,
      backend: "MediaElement",
      media: mediaElement,
    });

    originalMediaRef.current = ws;

    ws.on("ready", () => {
      setIsReady(true);
      const duration = ws.getDuration();
      containerRef.current.style.width = `${duration * (pixelsPerSecond || 30)}px`;
    });

    const handleClick = () => {
      if (ws.isPlaying()) {
        ws.pause();
        setIsPlayingOriginalMedia(false);
      } else {
        ws.play();
        setIsPlayingOriginalMedia(true);
      }
    };

    containerRef.current.addEventListener("click", handleClick);

    return () => {
      containerRef.current?.removeEventListener("click", handleClick);
      ws.destroy();
      originalMediaRef.current = null;
    };
  }, [mediaUrl, pixelsPerSecond, originalMediaRef]);

  return (
    <>
      <div
        style={{
          position: "relative",
          width: "100%",
          height: "64px",
          borderRadius: "6px",
          cursor: "pointer",
          overflow: "hidden",
        }}
        ref={containerRef}
      >
        {!isReady && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background:
                "repeating-linear-gradient(to right, #4b5563 0, #4b5563 2px, #374151 2px, #374151 6px)",
              color: "#e5e7eb",
              fontSize: "15px",
              fontWeight: "500",
              borderRadius: "6px",
            }}
          >
            🎧 Waves are generating...
          </div>
        )}
      </div>

      {showPlayPauseButton && (
        <button
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
            marginTop: "8px",
            padding: "6px 12px",
            borderRadius: "6px",
            border: "none",
            backgroundColor: isPlayingOriginalMedia ? "#ef4444" : "#7c3aed",
            color: "white",
            cursor: "pointer",
            fontWeight: 500,
            transition: "all 0.2s ease-in-out",
          }}
        >
          {isPlayingOriginalMedia ? "⏸ Pause" : "▶️ Play"}
        </button>
      )}
    </>
  );
};

export default OriginalAudioWaveComponent;
