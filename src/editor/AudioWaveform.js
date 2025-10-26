import WavesurferPlayer from "@wavesurfer/react";
import {useEffect, useState} from "react";

export const AudioWaveform = ({
  audioUrl,
  loadingRender,
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    setIsLoading(true);
    setHasError(false);
  }, [audioUrl]);

  
  return (
    <div
      className={
        !isLoading
          ? `px-3 relative w-full h-full rounded overflow-hidden`
          : "h-full w-full flex items-center justify-center"
      }
      style={{ height: "100%" }}
    >
      {isLoading && !hasError && <>{loadingRender}</>}
      {hasError && loadingRender}

      <WavesurferPlayer
        key={audioUrl || "no-audio"}  
        height={60}
        waveColor="#00D282"
        progressColor="transparent"
        cursorColor="transparent"
        interact={false}
        normalize={true}
        url={audioUrl}
        onReady={() => setIsLoading(false)}
        onError={() => {
          setHasError(true);
          setIsLoading(false);
        }}
      />
    </div>

  );
};
