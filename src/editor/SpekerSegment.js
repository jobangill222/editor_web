import React, { useState, useRef, useEffect, useCallback } from "react";
import { AudioWaveform } from "./AudioWaveform";

const pixelsPerSecond = 30; // 30px = 1s

const secondsToPixels = (s) => s * pixelsPerSecond;
const pixelsToSeconds = (px) => px / pixelsPerSecond;

const SpekerSegment = ({ speakerSegments, onSegmentTimeChange, onSegmentSplit, onDeleteSegment, pausePlaying }) => {

  const [segments, setSegments] = useState(speakerSegments);

  const dragData = useRef({
    id: null,
    startX: 0,
    type: null,
    initialLeft: 0,
    initialWidth: 0,
  });
  const [contextMenu, setContextMenu] = useState(null);
  const segmentsRef = useRef(segments);

  useEffect(() => {
    segmentsRef.current = segments;
  }, [segments]);

  const triggerEvent = (type, payload) => console.log(`🎯 ${type}:`, payload);

  /** ---------------- MOUSE HANDLERS ---------------- **/
  const handleMouseDown = (e, id, type) => {
    e.stopPropagation();
    const seg = segments.find((s) => s.id === id);
    if (!seg) return;

    lastChangedRef.current = { ...seg };

    const startX = secondsToPixels(seg.start);
    const width = secondsToPixels(seg.end - seg.start);

    dragData.current = {
      id,
      type,
      startX: e.clientX,
      initialLeft: startX,
      initialWidth: width,
    };

    triggerEvent("dragStart", { id, type, start: seg.start, end: seg.end });

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  };

  const lastChangedRef = useRef(null);

  const handleMouseMove = (e) => {
    const { id, type, startX, initialLeft, initialWidth } = dragData.current;
    if (!id) return;

    const deltaX = e.clientX - startX;

    setSegments((prev) =>
      prev.map((seg) => {
        if (seg.id !== id) return seg;

        if (type === "move") {
          const newStart = pixelsToSeconds(Math.max(0, initialLeft + deltaX));
          const duration = seg.end - seg.start;
          const newEnd = newStart + duration;
          triggerEvent("dragging", { id, start: newStart, end: newEnd });
          return { ...seg, start: newStart, end: newEnd };
        }

        if (type === "resize-left") {
          const newWidth = Math.max(1, initialWidth - deltaX);
          const newStart = pixelsToSeconds(initialLeft + deltaX);
          const newEnd = seg.end;
          if (newStart < 0 || newEnd <= newStart) return seg;
          triggerEvent("resizing-left", { id, start: newStart, end: newEnd });
          return { ...seg, start: newStart };
        }

        if (type === "resize-right") {
          const newWidth = Math.max(1, initialWidth + deltaX);
          const newEnd = seg.start + pixelsToSeconds(newWidth);
          if (newEnd <= seg.start) return seg;
          triggerEvent("resizing-right", { id, start: seg.start, end: newEnd });
          return { ...seg, end: newEnd };
        }

        return seg;
      })
    );
  };

  const handleMouseUp = async () => {
    const { id, type } = dragData.current;
    if (id) {
      const seg = segmentsRef.current.find((s) => s.id === id);
      if (seg)
        // triggerEvent("dragEnd", { id: seg.id, start: seg.start, end: seg.end });

        console.log("mouse release", {
          id: seg.id,
          start: seg.start,
          end: seg.end,
        });

      const oldSegment = lastChangedRef.current;

      console.log("oldSegment", oldSegment);
      
      dragData.current = { id: null, type: null };
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);

      if (oldSegment?.start !== seg.start || oldSegment?.end !== seg.end) {
        // Call the API
        await updateSegmentTimeHandler({
          segmentId: seg.id,
          type: type,
          start: seg.start,
          end: seg.end,
          oldSegment,
        });

      }
    }
  };

  const updateSegmentTimeHandler = async (data) => {
    pausePlaying();
    console.log("payload data", data);
    try {
      // const payload = {
      //   regenerate: data?.type === "move" ? false : true, // you can later switch to true if needed
      //   start: data.start,
      //   end: data.end,
      // };

      // const res = await fetch(
      //   `https://fameplay.hub.seraphic.io/api/v1/task/update-segment-time/${data.segmentId}`,
      //   {
      //     method: "POST",
      //     headers: { "Content-Type": "application/json" },
      //     body: JSON.stringify(payload),
      //   }
      // );

      // if (!res.ok) throw new Error("Server returned an error");

      // const updatedSegment = await res.json();
      // console.log("✅ Segment updated via API:", updatedSegment);

      const updatedSegment = {
        start: data.start,
        end: data.end,
        translatedAudioUrl: data?.oldSegment?.audioUrl,
        text: data?.oldSegment?.text,
      }

      // Update segment locally with backend response
      setSegments((prev) =>
        prev.map((s) =>
          s.id === data.segmentId
            ? {
                ...s,
                start: Number(updatedSegment.start),
                end: Number(updatedSegment.end),
                audioUrl: updatedSegment.translatedAudioUrl ?? null,
                text: updatedSegment?.text ?? "Empty text",
              }
            : s
        )
      );

      // Update in main speaker state
      if (onSegmentTimeChange) {
        onSegmentTimeChange(
          segmentsRef.current.map((s) =>
            s.id === data.segmentId
              ? {
                  ...s,
                  start: Number(updatedSegment.start),
                  end: Number(updatedSegment.end),
                  audioUrl: updatedSegment.translatedAudioUrl ?? null,
                  text: updatedSegment?.text ?? "Empty text",
                }
              : s
          )
        );
      }
      
    } catch (err) {
      console.error("❌ API update failed — reverting:", err);
      console.log("data", data);
      // Roll back to previous position if API fails
      setSegments((prev) =>
        prev.map((s) =>
          s.id === data.oldSegment.id ? { ...s, ...data.oldSegment } : s
        )
      );
    }
  };

  /** ---------------- SPLIT & DELETE ---------------- **/
  const handleDoubleClick = (e, seg) => {
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const splitTime = seg.start + pixelsToSeconds(clickX);

    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      segment: seg,
      splitTime,
    });
  };

  const handleSplit = async () => {
    pausePlaying();
  if (!contextMenu) return;
  const { segment, splitTime } = contextMenu;

  // Keep backup of current state before modifying
  const prevSegments = [...segmentsRef.current]; // useRef or state variable

  try {

     // const response = await fetch(`/api/split-segment`, {
      //   method: "POST",
      //   headers: { "Content-Type": "application/json" },
      //   body: JSON.stringify({
      //     segmentId: segment.id,
      //     splitAt: splitTime,
      //   }),
      // });
  
      // if (!response.ok) throw new Error("Failed to split segment");
  
      // // 🔹 2. Parse the result (backend returns an array of two new segments)
      // const splitResult = await response.json();
      
    // Mock backend result (replace with API call later)
    const splitResult = [
      {
        id: `${segment?.id}_a`,
        start: segment.start,      // original start
        end: splitTime,            // split point
        audioUrl: "https://fameplay-dev.s3.amazonaws.com/temp/projects/68f08590423e7a278aec8387/audios/5.wav",
        text: "split test 1",
      },
      {
        id: `${segment?.id}_b`,
        start: splitTime,          // split point
        end: segment.end,          // original end
        audioUrl: "https://fameplay-dev.s3.amazonaws.com/projects/68f08590423e7a278aec8387/audios/68f08590423e7a278aec838a/68f085d3423e7a278aec847c-1760981449762.mp3",
        text: "split test 2",
      },
    ];    

    // Update single child segment
    setSegments((prev) =>
      prev
        .filter((s) => s.id !== segment.id)
        .concat(splitResult)
        .sort((a, b) => a.start - b.start)
    );

    // Main inside speaker state
    if (onSegmentSplit) {
      onSegmentSplit(segment?.id, splitResult);
    }

    triggerEvent("split", {
      id: segment.id,
      splitAt: splitTime,
      newSegments: splitResult,
    });

  } catch (error) {
    console.error("Split error:", error);

    // Restore old state if something fails
    setSegments(prevSegments);
  } finally {
    setContextMenu(null);
  }
};

  
  const handleDelete = () => {
    if (!contextMenu) return;
    const { segment } = contextMenu;

    pausePlaying();

    setSegments((prev) => prev.filter((s) => s.id !== segment.id));

    if(onDeleteSegment) {
      onDeleteSegment(segment.id);
    }
    triggerEvent("delete", { id: segment.id });

    setContextMenu(null);
  };

  const handleClickOutside = useCallback(() => setContextMenu(null), []);
  useEffect(() => {
    if (contextMenu) {
      document.addEventListener("click", handleClickOutside);
      return () => document.removeEventListener("click", handleClickOutside);
    }
  }, [contextMenu, handleClickOutside]);

  /** ---------------- RENDER ---------------- **/
  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        overflow: "hidden",
        color: "#fff",
      }}
    >
      <div
        style={{
          // width: `${totalWidth}px`,
          // height: "180px",
          position: "relative",
        }}
      >
        {segments.map((seg) => {
          const left = secondsToPixels(seg.start);
          const width = secondsToPixels(seg.end - seg.start);

          return (
            <div
              key={seg.id}
              onMouseDown={(e) => handleMouseDown(e, seg.id, "move")}
              onDoubleClick={(e) => handleDoubleClick(e, seg)}
              style={{
                position: "absolute",
                top: "2px",
                left: `${left}px`,
                width: `${width}px`,
                height: "60px",
                backgroundColor: "rgba(211, 243, 229, 1)",
                border: "2px solid #00D282",
                borderRadius: "4px",
                cursor: "grab",
                boxSizing: "border-box",
              }}
            >
              {/* Left resize handle */}
              <div
                onMouseDown={(e) => handleMouseDown(e, seg.id, "resize-left")}
                style={{
                  position: "absolute",
                  left: "-4px", // for left handle
                  top: 0,
                  width: "6px",
                  height: "100%",
                  backgroundColor: "rgba(255,255,255,0.15)",
                  cursor: "w-resize",
                }}
              />

              <AudioWaveform
                audioUrl={seg.audioUrl}
                loadingRender={
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "flex-start", // align text from the left
                      height: "100%",
                      width: "100%",
                      textAlign: "left",
                      fontSize: "clamp(10px, 1.2vw, 14px)",
                      color: "#00D282",
                      padding: "0 6px",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      boxSizing: "border-box",
                    }}
                    title={seg.text || "No Audio"} // full text on hover
                  >
                    {seg.text || "No Audio"}
                  </div>
                }
              />

              {/* Right resize handle */}
              <div
                onMouseDown={(e) => handleMouseDown(e, seg.id, "resize-right")}
                style={{
                  position: "absolute",
                  right: "-4px", // for right handle
                  top: 0,
                  width: "6px",
                  height: "100%",
                  backgroundColor: "rgba(255,255,255,0.15)",
                  cursor: "e-resize",
                }}
              />
            </div>
          );
        })}
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <div
          style={{
            position: "fixed",
            top: contextMenu.y + 5,
            left: contextMenu.x + 5,
            background: "#111827",
            border: "1px solid #00D282",
            borderRadius: "6px",
            padding: "6px 0",
            zIndex: 999,
            boxShadow: "0 2px 6px rgba(0,0,0,0.3)",
          }}
        >
          <div
            onClick={handleSplit}
            style={{
              padding: "6px 12px",
              cursor: "pointer",
              borderBottom: "1px solid #00D28233",
            }}
          >
            ✂️ Split
            <span style={{ color: "#00D282", fontSize: "13px" }}>
              {contextMenu.splitTime.toFixed(2)}s
            </span>
          </div>
          <div
            onClick={handleDelete}
            style={{ padding: "6px 12px", cursor: "pointer" }}
          >
            🗑️ Delete
          </div>
        </div>
      )}
    </div>
  );
};

export default SpekerSegment;
