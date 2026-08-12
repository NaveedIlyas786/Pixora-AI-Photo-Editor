"use client";
import {
  CheckCircle,
  Clock,
  Crop,
  Download,
  Expand,
  Loader2,
  Scissors,
  Type,
  Zap,
} from "lucide-react";
import React, { useState } from "react";
import { motion } from "framer-motion";
import UploadZone from "./upload-zone";
import { Button } from "@/components/ui/button";
import CanvasEditor from "./canvas-editor";
import { saveAs } from "file-saver";

type JobStatus = "idle" | "queued" | "processing" | "completed" | "error";

interface ProcessingJob {
  id: string;
  type: string;
  status: JobStatus;
  progress: number;
  result?: string;
}

interface EditorTool {
  id: string;
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  description: string;
  hasPrompt?: boolean;
}

const primaryTools: EditorTool[] = [
  {
    id: "e-bgremove",
    name: "Remove Background",
    icon: Scissors,
    color: "primary",
    description: "Remove background with AI",
  },
  {
    id: "e-removedotbg",
    name: "Remove Background (Pro)",
    icon: Scissors,
    color: "secondary",
    description: "High-quality background removal",
  },
  {
    id: "e-changebg",
    name: "Change Background",
    icon: Expand,
    color: "primary",
    description: "Replace background with AI",
    hasPrompt: true,
  },
  {
    id: "e-edit",
    name: "AI Edit",
    icon: Type,
    color: "secondary",
    description: "Edit image with text prompts",
    hasPrompt: true,
  },
  {
    id: "bg-genfill",
    name: "Generative Fill",
    icon: Expand,
    color: "primary",
    description: "Fill empty areas with AI",
    hasPrompt: true,
  },
];

const secondaryTools: EditorTool[] = [
  {
    id: "e-dropshadow",
    name: "AI Drop Shadow",
    icon: Zap,
    color: "secondary",
    description: "Add realistic shadows",
  },
  {
    id: "e-retouch",
    name: "AI Retouch",
    icon: Zap,
    color: "primary",
    description: "Enhance and retouch image",
  },
  {
    id: "e-upscale",
    name: "AI Upscale 2x",
    icon: Zap,
    color: "secondary",
    description: "Upscale image quality",
  },
  {
    id: "e-genvar",
    name: "Generate Variations",
    icon: Type,
    color: "primary",
    description: "Create image variations",
  },
  {
    id: "e-crop-face",
    name: "Face Crop",
    icon: Crop,
    color: "secondary",
    description: "Smart face-focused cropping",
  },
  {
    id: "e-crop-smart",
    name: "Smart Crop",
    icon: Crop,
    color: "primary",
    description: "AI-powered intelligent cropping",
  },
];

const allTools = [...primaryTools, ...secondaryTools];

// Background AI tools conflict — only one should be active at a time
const BACKGROUND_TOOLS = new Set([
  "e-bgremove",
  "e-removedotbg",
  "e-changebg",
]);

const Editor = () => {
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [processedImage, setProcessedImage] = useState<string | null>(null);
  const [currentJob, setCurrentJob] = useState<ProcessingJob | null>(null);
  const [editHistory, setEditHistory] = useState<ProcessingJob[]>([]);
  const [activeEffects, setActiveEffects] = useState<Set<string>>(new Set());
  const [effectPrompts, setEffectPrompts] = useState<Record<string, string>>(
    {}
  );
  const [promptText, setPromptText] = useState<string>("");
  const [showPromptInput, setShowPromptInput] = useState<boolean>(false);
  const [pendingToolId, setPendingToolId] = useState<string | null>(null);

  const handleImageUpload = (imageUrl: string) => {
    setUploadedImage(imageUrl);
    setProcessedImage(null);
    setCurrentJob(null);
    setActiveEffects(new Set());
    setEffectPrompts({});
  };

  const handlePromptSubmit = async () => {
    if (!promptText.trim() || !pendingToolId) return;

    await applyEffect(pendingToolId, promptText.trim());
    setShowPromptInput(false);
    setPromptText("");
    setPendingToolId(null);
  };

  const getImageKitTransform = (toolId: string, prompt?: string): string => {
    switch (toolId) {
      case "e-bgremove":
        return "e-bgremove";
      case "e-removedotbg":
        return "e-removedotbg";
      case "e-changebg":
        return prompt
          ? `e-changebg-prompt-${encodeURIComponent(prompt)}`
          : "";
      case "e-edit":
        // ImageKit syntax is e-edit-prompt-{text}, not e-edit:{text}
        return prompt ? `e-edit-prompt-${encodeURIComponent(prompt)}` : "";
      case "bg-genfill":
        // Requires resize + pad strategy alongside the fill
        return prompt
          ? `w-1000,h-1000,cm-pad_resize,bg-genfill-prompt-${encodeURIComponent(prompt)}`
          : "w-1000,h-1000,cm-pad_resize,bg-genfill";
      case "e-dropshadow":
        return "e-dropshadow";
      case "e-retouch":
        return "e-retouch";
      case "e-upscale":
        return "e-upscale";
      case "e-genvar":
        return "e-genvar";
      case "e-crop-face":
        return "fo-face";
      case "e-crop-smart":
        return "fo-auto";
      default:
        return "";
    }
  };

  const buildTransformUrl = (
    imageUrl: string,
    effects: Set<string>,
    prompts: Record<string, string>
  ) => {
    const transforms = Array.from(effects)
      .map((effect) => getImageKitTransform(effect, prompts[effect]))
      .filter(Boolean);

    if (transforms.length === 0) return imageUrl;

    // ImageKit requires AI transforms in separate chain steps joined by ":"
    return `${imageUrl}?tr=${transforms.join(":")}`;
  };

  const handleToolClick = async (toolId: string) => {
    if (!uploadedImage) return;

    const tool = allTools.find((t) => t.id === toolId);

    if (!tool) return;

    // Toggle effect on/off
    if (activeEffects.has(toolId)) {
      const newActiveEffects = new Set(activeEffects);
      newActiveEffects.delete(toolId);
      setActiveEffects(newActiveEffects);

      const newPrompts = { ...effectPrompts };
      delete newPrompts[toolId];
      setEffectPrompts(newPrompts);

      setProcessedImage(
        buildTransformUrl(uploadedImage, newActiveEffects, newPrompts)
      );
      return;
    }

    // Check if tool requires prompt
    if (tool.hasPrompt) {
      setPendingToolId(toolId);
      setShowPromptInput(true);
      setPromptText("");
      return;
    }

    // Apply effect immediately
    await applyEffect(toolId);
  };

  const applyEffect = async (toolId: string, prompt?: string) => {
    if (!uploadedImage) return;

    const newJob: ProcessingJob = {
      id: new Date().toString(),
      type: toolId,
      status: "queued",
      progress: 0,
    };

    setCurrentJob(newJob);

    // Apply effect to active effects (drop conflicting background tools)
    const newActiveEffects = new Set(activeEffects);
    if (BACKGROUND_TOOLS.has(toolId)) {
      for (const bgTool of BACKGROUND_TOOLS) {
        newActiveEffects.delete(bgTool);
      }
    }
    // e-edit rewrites the whole image — don't stack with other AI ops
    if (toolId === "e-edit") {
      newActiveEffects.clear();
    }
    newActiveEffects.add(toolId);
    setActiveEffects(newActiveEffects);

    const newPrompts = { ...effectPrompts };
    if (BACKGROUND_TOOLS.has(toolId)) {
      for (const bgTool of BACKGROUND_TOOLS) {
        delete newPrompts[bgTool];
      }
    }
    if (toolId === "e-edit") {
      for (const key of Object.keys(newPrompts)) {
        delete newPrompts[key];
      }
    }
    if (prompt) {
      newPrompts[toolId] = prompt;
    }
    setEffectPrompts(newPrompts);

    const newImageUrl = buildTransformUrl(
      uploadedImage,
      newActiveEffects,
      newPrompts
    );

    const markFailed = () => {
      const rolledBackEffects = new Set(newActiveEffects);
      rolledBackEffects.delete(toolId);
      setActiveEffects(rolledBackEffects);

      const rolledBackPrompts = { ...newPrompts };
      delete rolledBackPrompts[toolId];
      setEffectPrompts(rolledBackPrompts);

      setCurrentJob((prev) => (prev ? { ...prev, status: "error" } : null));
    };

    const markCompleted = () => {
      setProcessedImage(newImageUrl);
      setCurrentJob((prev) =>
        prev ? { ...prev, progress: 100, status: "completed" } : null
      );
      setEditHistory((prev) => [
        {
          ...newJob,
          status: "completed" as JobStatus,
          progress: 100,
          result: newImageUrl,
        },
        ...prev.slice(0, 2),
      ]);
    };

    const probeTransform = async (): Promise<
      "ready" | "pending" | "failed"
    > => {
      // Prefer image decode — works without CORS issues that break HEAD polls
      const imageStatus = await new Promise<"ready" | "error">((resolve) => {
        const img = new window.Image();
        img.onload = () => resolve("ready");
        img.onerror = () => resolve("error");
        img.src = `${newImageUrl}${newImageUrl.includes("?") ? "&" : "?"}ik-cache-buster=${Date.now()}`;
      });

      if (imageStatus === "ready") return "ready";

      // Confirm hard failures (400) vs "still preparing" intermediate responses
      try {
        const response = await fetch(newImageUrl, {
          method: "GET",
          cache: "no-cache",
        });

        if (response.status >= 400) return "failed";

        const intermediate =
          response.headers.get("is-intermediate-response") === "true";
        const contentType = response.headers.get("content-type") || "";

        if (intermediate || contentType.includes("text/html")) {
          return "pending";
        }

        if (contentType.startsWith("image/")) return "ready";
        return "pending";
      } catch {
        // Network/CORS while ImageKit is still preparing
        return "pending";
      }
    };

    try {
      setCurrentJob((prev) =>
        prev ? { ...prev, status: "processing", progress: 10 } : null
      );

      let attempts = 0;
      const maxAttempts = 60;
      const pollInterval = 5000;

      const pollImageKit = async (): Promise<void> => {
        attempts++;
        const status = await probeTransform();

        if (status === "ready") {
          markCompleted();
          return;
        }

        if (status === "failed") {
          markFailed();
          return;
        }

        setCurrentJob((prev) =>
          prev
            ? { ...prev, progress: Math.min(10 + attempts * 1.5, 90) }
            : null
        );

        if (attempts >= maxAttempts) {
          markFailed();
          return;
        }

        await new Promise((resolve) => setTimeout(resolve, pollInterval));
        return pollImageKit();
      };

      await pollImageKit();
    } catch (error) {
      console.error("Error applying effect:", error);
      markFailed();
    }
  };

  const handleExport = (format: string) => {
    if (!processedImage) return;

    saveAs(processedImage, `pixora-${Date.now()}.${format}`);
  };

  return (
    <section id="editor" className="py-24 relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 bg-gradient-to-b from-background to-muted/10" />

      <div className="container mx-auto px-4 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="text-center mb-12"
        >
          <h2 className="text-4xl lg:text-6xl font-bold mb-6">
            <span className="bg-gradient-primary !bg-clip-text text-transparent">
              Magic
            </span>
            <span className="text-foreground"> Studio</span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Upload your photo and transform it with AI-powered tools. See the
            magic happen in real-time.
          </p>
        </motion.div>

        <div className="grid lg:grid-cols-4 gap-8">
          {/* upload area */}
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="lg:col-span-1"
          >
            <UploadZone onImageUpload={handleImageUpload} />

            {/* Toolbar */}
            <div className="mt-6 space-y-3">
              <h3 className="text-lg font-semibold text-foreground mb-4">
                AI Tools
              </h3>

              {/* Prompt Input */}
              {showPromptInput && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-3 p-4 glass rounded-lg border border-card-border"
                >
                  <textarea
                    value={promptText}
                    onChange={(e) => setPromptText(e.target.value)}
                    placeholder="Describe what you want to change..."
                    className="w-full p-3 bg-background border border-border rounded-md text-foreground placeholder:text-muted-foreground resize-none"
                    rows={3}
                  />

                  <div className="flex gap-2">
                    <Button
                      onClick={handlePromptSubmit}
                      disabled={!promptText.trim()}
                      className="flex-1"
                    >
                      Apply
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setShowPromptInput(false);
                        setPendingToolId(null);
                        setPromptText("");
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </motion.div>
              )}

              {primaryTools.map((tool) => {
                const isActive = activeEffects.has(tool.id);
                const isProcessing =
                  currentJob?.type === tool.id &&
                  currentJob.status === "processing";
                const isQueued =
                  currentJob?.type === tool.id &&
                  currentJob.status === "processing";
                const isDisabled =
                  !uploadedImage || currentJob?.status === "processing";

                return (
                  <Button
                    key={tool.id}
                    variant={isActive ? "default" : "outline"}
                    className={`w-full justify-start shadow-glass transition-all ${
                      isActive
                        ? "bg-primary text-primary-foreground border-primary"
                        : "border-gray-600 hover:border-primary/30"
                    }`}
                    onClick={() => handleToolClick(tool.id)}
                    disabled={isDisabled}
                    title={tool.description}
                  >
                    <tool.icon
                      className={`h-4 w-4 mr-2 ${
                        isProcessing ? "animate-pulse" : ""
                      }`}
                    />
                    <div className="flex-1 text-left">
                      <div className="font-medium">{tool.name}</div>
                      {tool?.hasPrompt && (
                        <div className="text-xs opacity-70">
                          Requires Prompt
                        </div>
                      )}
                    </div>
                    {isActive && !isProcessing && (
                      <div className="w-2 h-2 bg-primary-foreground rounded-full" />
                    )}
                    {isQueued && (
                      <div className="w-2 h-2 bg-muted-foreground rounded-full animate-pulse" />
                    )}
                    {isProcessing && (
                      <Loader2 className="h-4 w-4 ml-auto animate-spin" />
                    )}
                  </Button>
                );
              })}
            </div>
          </motion.div>

          {/* Main Canvas */}
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="lg:col-span-2"
          >
            <CanvasEditor
              originalImage={uploadedImage}
              processedImage={processedImage}
              isProcessing={currentJob?.status === "processing"}
              hasError={currentJob?.status === "error"}
            />

            {/* Secondery Tools */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-6"
            >
              <h4 className="text-sm font-semibold text-foreground mb-3">
                Additional Tools
              </h4>
              <div className="grid grid-cols-2 gap-2">
                {secondaryTools.map((tool) => {
                  const isActive = activeEffects.has(tool.id);
                  const isProcessing =
                    currentJob?.type === tool.id &&
                    currentJob.status === "processing";
                  const isDisabled =
                    !uploadedImage || currentJob?.status === "processing";

                  return (
                    <Button
                      key={tool.id}
                      variant={isActive ? "default" : "outline"}
                      size="sm"
                      className={`justify-start shadow-glass transition-all ${
                        isActive
                          ? "bg-primary text-primary-foreground border-primary"
                          : "border-gray-600 hover:border-primary/30"
                      }`}
                      onClick={() => handleToolClick(tool.id)}
                      disabled={isDisabled}
                      title={tool.description}
                    >
                      <tool.icon
                        className={`h-3 w-3 mr-2 ${
                          isProcessing ? "animate-pulse" : ""
                        }`}
                      />
                      <span className="text-xs">{tool.name}</span>
                      {isActive && !isProcessing && (
                        <div className="w-1.5 h-1.5 bg-primary-foreground rounded-full ml-auto" />
                      )}
                      {isProcessing && (
                        <Loader2 className="h-3 w-3 ml-auto animate-spin" />
                      )}
                    </Button>
                  );
                })}
              </div>
            </motion.div>
          </motion.div>

          {/* Right Panel - Job Status */}
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="lg:col-span-1"
          >
            <div className="shadow-glass rounded-xl p-6 border border-gray-800">
              <h3 className="text-lg font-semibold text-foreground mb-4">
                Job Status
              </h3>

              {currentJob ? (
                <div className="space-y-4">
                  <div className="flex items-center space-x-3">
                    {currentJob.status === "processing" ? (
                      <Loader2 className="h-5 w-5 text-primary animate-spin" />
                    ) : currentJob.status === "completed" ? (
                      <CheckCircle className="h-5 w-5 text-primary" />
                    ) : currentJob.status === "queued" ? (
                      <Clock className="h-5 w-5 text-muted-foreground animate-pulse" />
                    ) : (
                      <Clock className="h-5 w-5 text-muted-foreground" />
                    )}
                    <div>
                      <p className="font-medium text-foreground capitalize">
                        {allTools.find((t) => t.id === currentJob.type)?.name ||
                          currentJob.type.replace("-", " ")}
                      </p>
                      <p className="text-sm text-muted-foreground capitalize">
                        {currentJob.status === "queued" &&
                          "Preparing AI transformation..."}
                        {currentJob.status === "processing" &&
                          `Processing with AI... (${currentJob.progress}%)`}
                        {currentJob.status === "completed" &&
                          "AI transformation completed!"}
                        {currentJob.status === "error" && "Processing failed"}
                      </p>
                    </div>
                  </div>

                  {(currentJob.status === "processing" ||
                    currentJob.status === "queued") && (
                    <div className="w-full bg-muted rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all duration-300 ${
                          currentJob.status === "queued"
                            ? "bg-muted-foreground animate-pulse"
                            : "bg-gradient-primary"
                        }`}
                        style={{
                          width:
                            currentJob.status === "queued"
                              ? "100%"
                              : `${currentJob.progress}%`,
                        }}
                      />
                      <div className="text-xs text-muted-foreground my-1 text-center">
                        {currentJob.status === "queued" && "Initializing..."}
                        {currentJob.status === "processing" &&
                          "Waiting for AI to complete transformation..."}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-muted-foreground text-sm">
                  Upload an image and select a tool to start
                </p>
              )}

              {/* Edit History */}
              {editHistory?.length > 0 && (
                <div className="mt-8">
                  <h4 className="text-sm font-semibold text-foreground mb-3 mt-1">
                    Recent Edits
                  </h4>
                  <div className="space-y-2">
                    {editHistory?.map((job) => (
                      <div
                        key={job.id}
                        className="flex items-center space-x-2 text-sm"
                      >
                        <CheckCircle className="h-3 w-3 text-primary flex-shrink-0" />
                        <span className="text-muted-foreground capitalize">
                          {job?.type?.replace("-", " ")}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Download Button */}
              {processedImage && (
                <div className="mt-6">
                  <Button
                    variant={"hero"}
                    onClick={() => handleExport("jpg")}
                    className="w-full"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download
                  </Button>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default Editor;