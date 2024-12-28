// components/EmbeddingGraph.tsx
// /Users/matthewsimon/Documents/Github/solomon-electron/next/src/components/canvas/(Admin)/_components/EmbeddingGraph.tsx

import React, { useEffect, useState, useRef } from "react";
import dynamic from "next/dynamic";
import { useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { cosineSimilarity } from "@/lib/similarity";
import { GraphData, GraphLink, GraphNode } from "@/types/graph";
import { Button } from "@/components/ui/button";
import { CircleMinus, CirclePlus } from "lucide-react";
// import { GUI } from "dat.gui"; // Now, type definitions are installed

const ForceGraph2D = dynamic(() => import("react-force-graph-2d"), { ssr: false });

interface EmbeddingChunk {
  id: string;
  pageContent: string;
  embedding: number[];
  metadata?: {
    snippet: string;
    module: string | null;
  };
}

const EmbeddingGraph: React.FC = () => {
  const INITIAL_LIMIT = 100; // Define the initial limit
  const [limit, setLimit] = useState(INITIAL_LIMIT); // Total limit
  const [cursor, setCursor] = useState<string | null>(null); // Pagination cursor
  const [allEmbeddings, setAllEmbeddings] = useState<EmbeddingChunk[]>([]); // Accumulated embeddings
  const [graphData, setGraphData] = useState<GraphData>({ nodes: [], links: [] });
  const [linkStrength, setLinkStrength] = useState(1); // Link strength state

  const topK = 5; // Number of top similar nodes to connect

  const graphRef = useRef<any>(); // Reference to ForceGraph2D

  // Fetch embeddings with current limit and cursor
  const data = useQuery(api.chunks.getAllEmbeddings, { limit, cursor });
  const isLoading = data === undefined;

  // Load persisted data and camera state on mount
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

  // Log the query result for debugging
  useEffect(() => {
    console.log("Fetched Data:", data);
  }, [data]);

  // Update embeddings and cursor when new data is fetched
  useEffect(() => {
    // Only fetch if no data is loaded from sessionStorage
    if (allEmbeddings.length === 0 && data?.chunks && data.chunks.length > 0) {
      console.log("Fetched Chunks:", data.chunks);
      setAllEmbeddings((prev) => [...prev, ...data.chunks]);
      setCursor(data.nextCursor);
    } else if (allEmbeddings.length === 0) {
      console.log("No chunks fetched in this batch.");
    }
  }, [data, allEmbeddings.length]);

  // Compute graph data whenever allEmbeddings change
  useEffect(() => {
    if (allEmbeddings.length === 0) return;

    // Create nodes
    const nodes: GraphNode[] = allEmbeddings.map((chunk) => ({
      id: chunk.id,
      label: chunk.metadata?.snippet || "No snippet available",
      group: chunk.metadata?.module || null,
    }));

    // Compute similarities and create links
    const links: GraphLink[] = [];

    allEmbeddings.forEach((chunkA, indexA) => {
      // Compute similarities with other chunks
      const similarities = allEmbeddings.map((chunkB, indexB) => {
        if (indexA === indexB) return { id: chunkB.id, similarity: -1 };
        const sim = cosineSimilarity(chunkA.embedding, chunkB.embedding);
        return { id: chunkB.id, similarity: sim };
      });

      // Sort by similarity descending and take top K
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

  // Persist graphData and allEmbeddings to sessionStorage whenever they change
  useEffect(() => {
    if (allEmbeddings.length > 0) {
      sessionStorage.setItem("allEmbeddings", JSON.stringify(allEmbeddings));
      sessionStorage.setItem("graphData", JSON.stringify(graphData));
    }
  }, [allEmbeddings, graphData]);

  // Save camera state to sessionStorage when the graph engine stops (after layout)
  const handleEngineStop = () => {
    if (graphRef.current) {
      const camera = graphRef.current.camera();
      sessionStorage.setItem("camera", JSON.stringify(camera));
    }
  };

  // Optionally, save camera state before unload
  useEffect(() => {
    const handleBeforeUnload = () => {
      handleEngineStop();
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, []);

  // Function to load more embeddings
  const loadMore = () => {
    if (cursor) {
      setLimit((prev) => prev + 100); // Increase the limit by 100
    }
  };

  // Function to load less embeddings
  const loadLess = () => {
    if (allEmbeddings.length > INITIAL_LIMIT) {
      const newEmbeddings = allEmbeddings.slice(0, allEmbeddings.length - 100);
      setAllEmbeddings(newEmbeddings);
      setLimit((prev) => Math.max(prev - 100, INITIAL_LIMIT)); // Decrease limit but not below INITIAL_LIMIT

      // Note: To properly manage the cursor, you might need to implement a cursor history stack.
      // This example does not handle cursor reversal, which would require additional logic.
    }
  };

  // Display different states based on data fetching
  if (isLoading && allEmbeddings.length === 0) {
    return <div>Loading...</div>;
  }

  if (!isLoading && allEmbeddings.length === 0) {
    return <div>No embeddings available.</div>;
  }

  return (
    <div className="w-full h-full">
      <ForceGraph2D
        ref={graphRef}
        graphData={graphData}
        nodeLabel="label"
        nodeAutoColorBy="group"
        linkWidth={(link) => link.similarity * linkStrength} // Dynamic link width
        linkDirectionalParticles={1}
        linkDirectionalParticleWidth={(link) => link.similarity * linkStrength} // Dynamic particle width
        backgroundColor="gray-50"
        nodeCanvasObject={(node, ctx, globalScale) => {
          // Draw the node
          const fontSize = 12 / globalScale;
          ctx.font = `${fontSize}px Sans-Serif`;
          ctx.fillStyle = node.color;
          ctx.beginPath();
          ctx.arc(node.x!, node.y!, 8, 0, 2 * Math.PI, false); // Increased radius: 8
          ctx.fill();

          // Removed the following lines to disable text on nodes
          // ctx.fillStyle = "black";
          // ctx.fillText(label, node.x! + 6, node.y! + 3);
        }}
        onEngineStop={handleEngineStop} // Save camera state when the graph layout is done
        width={1180} // Adjust as needed or make responsive
        height={620} // Adjust as needed or make responsive
      />
      <div className="border-t flex space-x-4 mt-4">
        <Button
          variant={"outline"}
          onClick={loadLess}
          className="ml-2 mt-2 px-3 py-2 rounded"
          disabled={allEmbeddings.length <= INITIAL_LIMIT} // Disable if at initial limit
        >
          <CircleMinus />
        </Button>
        <Button
          variant={"outline"}
          onClick={loadMore}
          className="mt-2 px-3 py-2 rounded"
          disabled={!cursor} // Disable if there's no more data to load
        >
          <CirclePlus />
        </Button>
      </div>
    </div>
  );
};

export default EmbeddingGraph;