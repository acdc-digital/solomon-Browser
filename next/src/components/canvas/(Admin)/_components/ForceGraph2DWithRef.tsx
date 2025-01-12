// ForceGraph2DWithRef.tsx
// /Users/matthewsimon/Documents/Github/solomon-desktop/solomon-Desktop/next/src/components/canvas/(Admin)/_components/ForceGraph2DWithRef.tsx

import React, { forwardRef } from "react";
import { ForceGraph2D } from "react-force-graph-2d";

const ForceGraph2DWrapper = forwardRef((props, ref) => {
  return <ForceGraph2D ref={ref} {...props} />;
});

export default ForceGraph2DWrapper;
