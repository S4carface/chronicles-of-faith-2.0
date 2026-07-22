import React from "react";
import DifficultySelect from "@/components/game/DifficultySelect";

// Easy/Normal/Hard selector + one compact selected-difficulty rule row
// (DifficultySelect's own compact mode), tucked directly above Start
// Journey on the post-tutorial dashboard — the only Home layout that shows
// it. Kept as its own component so ReturningHome's composition reads as a
// list of named sections rather than an inline DifficultySelect call.
export default function HomeDifficultySection() {
  return (
    <div className="w-full shrink-0 px-4 pb-2 [@media(max-height:700px)]:pb-1 lg:px-8">
      <DifficultySelect compact />
    </div>
  );
}
