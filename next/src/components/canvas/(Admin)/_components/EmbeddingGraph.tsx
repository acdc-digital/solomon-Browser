// components/EmbeddingGraph.tsx
// /Users/matthewsimon/Documents/Github/solomon-electron/next/src/components/canvas/(Admin)/_components/EmbeddingGraph.tsx

import React, { useEffect, useState, useRef } from "react";
import dynamic from "next/dynamic";
import { useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { cosineSimilarity } from "@/lib/similarity";
import { GraphData, GraphLink, GraphNode } from "@/types/graph";
import { Button } from "@/components/ui/button";
import { CircleMinus, CirclePlus, RefreshCcw } from "lucide-react";

// We load react-force-graph-2d dynamically for SSR reasons
const ForceGraph2D = dynamic(() => import("react-force-graph-2d"), { ssr: false });

/**
 * Represents each chunk returned by getAllEmbeddings.
 * We assume it has keywords + topics in metadata. Adjust as needed.
 */
interface EmbeddingChunk {
  id: string;
  pageContent: string;
  embedding: number[];
  metadata?: {
    // Possibly more fields exist
    keywords?: string[];
    topics?: string[];
    module?: string | null;
  };
}

const EmbeddingGraph: React.FC = () => {
  const INITIAL_LIMIT = 100;
  const [limit, setLimit] = useState(INITIAL_LIMIT);
  const [cursor, setCursor] = useState<string | null>(null);
  const [allEmbeddings, setAllEmbeddings] = useState<EmbeddingChunk[]>([]);
  const [graphData, setGraphData] = useState<GraphData>({ nodes: [], links: [] });
  const [linkStrength, setLinkStrength] = useState(1);
  const [cursorHistory, setCursorHistory] = useState<(string | null)[]>([null]);

  const topK = 5; // how many neighbors each node connects to
  const graphRef = useRef<any>();

  // Fetch chunk embeddings with current limit + cursor
  const data = useQuery(api.chunks.getAllEmbeddings, { limit, cursor });
  const isLoading = data === undefined;

  /**
   * 1. On mount, try to load from sessionStorage
   *    so we keep state between page reloads or navigations.
   */
  useEffect(() => {
    const savedEmbeddings = sessionStorage.getItem("allEmbeddings");
    const savedGraphData = sessionStorage.getItem("graphData");
    const savedCamera = sessionStorage.getItem("camera");

    if (savedEmbeddings && savedGraphData) {
      setAllEmbeddings(JSON.parse(savedEmbeddings));
      setGraphData(JSON.parse(savedGraphData));

      if (savedCamera && graphRef.current) {
        const cameraState = JSON.parse(savedCamera);
        graphRef.current.camera(cameraState);
      }
    }
  }, []);

  // 2. Log newly fetched data for debugging
  useEffect(() => {
    console.log("Fetched Data:", data);
  }, [data]);

  /**
   * 3. If we have no embeddings loaded from sessionStorage,
   *    and we just fetched a new batch, push them to `allEmbeddings`.
   */
  useEffect(() => {
    if (allEmbeddings.length === 0 && data?.chunks && data.chunks.length > 0) {
      console.log("Fetched Chunks:", data.chunks);
      setAllEmbeddings((prev) => [...prev, ...data.chunks]);
      setCursor(data.nextCursor);
      setCursorHistory((prev) => [...prev, data.nextCursor]);
    } else if (allEmbeddings.length === 0) {
      console.log("No chunks fetched in this batch.");
    }
  }, [data, allEmbeddings.length]);

  /**
   * 4. Compute the graph data whenever `allEmbeddings` changes
   */
  useEffect(() => {
    if (allEmbeddings.length === 0) return;

    // Create nodes, label each node by keywords, color by "dominant topic"
    const nodes: GraphNode[] = allEmbeddings.map((chunk) => {
      // 1. Build a label from keywords
      let labelStr = "No keywords available";
      const kw = chunk.metadata?.keywords;
      if (kw && kw.length > 0) {
        labelStr = kw.join(", ");
      }

      // 2. Decide group color by "dominant topic"
      // e.g., if topics exist, we pick the first, else 'No topic'
      let groupTopic = "No topic";
      const tp = chunk.metadata?.topics;
      if (tp && tp.length > 0) {
        groupTopic = tp[0];
      }

      return {
        id: chunk.id,
        label: labelStr,
        group: groupTopic, // used by nodeAutoColorBy
      };
    });

    // Build similarity-based links
    const links: GraphLink[] = [];
    allEmbeddings.forEach((chunkA, indexA) => {
      // Calculate sim to all others
      const similarities = allEmbeddings.map((chunkB, indexB) => {
        if (indexA === indexB) return { id: chunkB.id, similarity: -1 };
        const sim = cosineSimilarity(chunkA.embedding, chunkB.embedding);
        return { id: chunkB.id, similarity: sim };
      });

      // Sort by similarity descending, take top K
      const topSimilar = similarities
        .filter((sim) => sim.similarity > 0)
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, topK);

      topSimilar.forEach((sim) => {
        links.push({
          source: chunkA.id,
          target: sim.id,
          similarity: sim.similarity,
        });
      });
    });

    setGraphData({ nodes, links });
  }, [allEmbeddings]);

  /**
   * 5. Persist the updated embeddings/graph to sessionStorage
   */
  useEffect(() => {
    if (allEmbeddings.length > 0) {
      sessionStorage.setItem("allEmbeddings", JSON.stringify(allEmbeddings));
      sessionStorage.setItem("graphData", JSON.stringify(graphData));
    }
  }, [allEmbeddings, graphData]);

  /**
   * 6. Save camera state to sessionStorage when the engine stops
   */
  const handleEngineStop = () => {
    if (graphRef.current) {
      const camera = graphRef.current.camera();
      sessionStorage.setItem("camera", JSON.stringify(camera));
    }
  };

  // Optionally, save camera state before unload as well
  useEffect(() => {
    const handleBeforeUnload = () => {
      handleEngineStop();
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, []);

  /**
   * 7. Provide "loadMore" and "loadLess" for pagination or chunk-based expansions
   */
  const loadMore = () => {
    const latestCursor = cursorHistory[cursorHistory.length - 1];
    if (latestCursor) {
      setLimit((prev) => prev + 100);
    }
  };
  
  const loadLess = () => {
    if (cursorHistory.length > 1) {
      setCursorHistory((prev) => prev.slice(0, prev.length - 1));
      setAllEmbeddings((prev) => prev.slice(0, prev.length - 100));
      setLimit((prev) => Math.max(prev - 100, INITIAL_LIMIT));
      setCursor(cursorHistory[cursorHistory.length - 2]);
    }
  };

  /**
   * 8. Refresh the entire graph (clears session data & state)
   */
  const handleRefresh = () => {
    sessionStorage.removeItem("allEmbeddings");
    sessionStorage.removeItem("graphData");
    sessionStorage.removeItem("camera");
    
    setAllEmbeddings([]);
    setGraphData({ nodes: [], links: [] });
    setCursor(null);
    setLimit(INITIAL_LIMIT);
  };

  /**
   * 9. Conditionals for different states
   */
  if (isLoading && allEmbeddings.length === 0) {
    return <div>Loading...</div>;
  }

  if (!isLoading && allEmbeddings.length === 0) {
    return <div>No embeddings available.</div>;
  }

  /**
   * 10. Render the ForceGraph + Controls
   */
  return (
    <div className="w-full h-full">
      <ForceGraph2D
        ref={graphRef}
        graphData={graphData}
        nodeLabel="label"
        // nodeAutoColorBy will color each node by the value in `node.group`
        nodeAutoColorBy="group"
        linkWidth={(link) => link.similarity * linkStrength}
        linkDirectionalParticles={1}
        linkDirectionalParticleWidth={(link) => link.similarity * linkStrength}
        backgroundColor="gray-50"
        // For performance, we skip drawing node text on the canvas
        nodeCanvasObject={(node, ctx, globalScale) => {
          const fontSize = 12 / globalScale;
          ctx.font = `${fontSize}px Sans-Serif`;
          ctx.fillStyle = node.color;
          ctx.beginPath();
          ctx.arc(node.x!, node.y!, 8, 0, 2 * Math.PI, false);
          ctx.fill();
          // If you'd like to see text on each node, uncomment lines below:
          // const label = node.label || "";
          // ctx.fillStyle = "black";
          // ctx.fillText(label, node.x! + 6, node.y! + 3);
        }}
        onEngineStop={handleEngineStop}
        width={1180}
        height={620}
      />
      {/* Buttons row */}
      <div className="border-t flex space-x-2 mt-4">
        <Button
          variant="outline"
          onClick={loadLess}
          className="ml-2 mt-2 px-3 py-2 rounded"
          disabled={allEmbeddings.length <= INITIAL_LIMIT}
        >
          <CircleMinus />
        </Button>
        <Button
          variant="outline"
          onClick={loadMore}
          className="mt-2 px-3 py-2 rounded"
          disabled={!cursor}
        >
          <CirclePlus />
        </Button>
        <Button
          variant="outline"
          onClick={handleRefresh}
          className="mt-2 px-3 py-2 rounded"
          title="Refresh Graph"
        >
          <RefreshCcw />
        </Button>
      </div>
    </div>
  );
};

export default EmbeddingGraph;