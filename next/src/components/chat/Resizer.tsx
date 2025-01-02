// Panel Resizer
// /Users/matthewsimon/Documents/Github/solomon-electron/next/src/components/chat/Resizer.tsx

type ResizeHandler = (
    e: React.MouseEvent | React.TouchEvent,
    setWidth: (w: number) => void,
    MIN_WIDTH: number,
    MAX_WIDTH: number
  ) => void;
  
  export const initResize: ResizeHandler = (e, setWidth, MIN_WIDTH, MAX_WIDTH) => {
    e.preventDefault();
  
    // Distinguish MouseEvent vs. TouchEvent
    const startX =
      "touches" in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
  
    // Read the current width from the DOM or from your store
    // If your store already has 'chatWidth', you can pass it in or read it from the store
    const startWidth = parseInt((document.getElementById("chatPanel")?.offsetWidth ?? 300).toString(), 10);
  
    // Add listeners
    function onMouseMove(ev: MouseEvent | TouchEvent) {
      let clientX: number;
      if ("touches" in ev) {
        clientX = ev.touches[0].clientX;
      } else {
        clientX = (ev as MouseEvent).clientX;
      }
  
      // Delta is how far we moved from the initial mouse/touch down
      const delta = clientX - startX;
      let newWidth = startWidth - delta;
  
      // Respect min/max
      if (newWidth < MIN_WIDTH) newWidth = MIN_WIDTH;
      if (newWidth > MAX_WIDTH) newWidth = MAX_WIDTH;
  
      setWidth(newWidth);
    }
  
    function onMouseUp() {
      document.removeEventListener("mousemove", onMouseMove as any);
      document.removeEventListener("touchmove", onMouseMove as any);
      document.removeEventListener("mouseup", onMouseUp);
      document.removeEventListener("touchend", onMouseUp);
    }
  
    // Listen for mouse/touch move events on the document
    document.addEventListener("mousemove", onMouseMove as any);
    document.addEventListener("touchmove", onMouseMove as any);
    document.addEventListener("mouseup", onMouseUp);
    document.addEventListener("touchend", onMouseUp);
  };