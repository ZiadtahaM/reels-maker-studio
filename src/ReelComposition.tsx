import React from 'react';
import { AbsoluteFill, useVideoConfig, useCurrentFrame, interpolate, spring } from 'remotion';

export const ReelComposition: React.FC<{ text: string }> = ({ text }) => {
  const { fps, durationInFrames } = useVideoConfig();
  const frame = useCurrentFrame();

  const opacity = interpolate(frame, [0, 15], [0, 1], {
    extrapolateRight: 'clamp',
  });

  const scale = spring({
    fps,
    frame,
    config: { damping: 12 },
  });

  return (
    <AbsoluteFill className="bg-gradient-to-br from-green-500 to-emerald-900 justify-center items-center">
      <div style={{ opacity, transform: `scale(${scale})` }} className="text-white text-6xl font-bold p-10 text-center">
        {text || "Hello Reel!"}
      </div>
    </AbsoluteFill>
  );
};
