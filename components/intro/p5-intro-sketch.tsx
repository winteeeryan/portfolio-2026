"use client";

import { useEffect, useRef } from "react";

type Props = {
  onFinish: () => void;
};

export default function P5IntroSketch({ onFinish }: Props) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const finishedRef = useRef(false);

  useEffect(() => {
    let p5Instance: any = null;
    let cancelled = false;

    async function init() {
      const p5Module = await import("p5");
      const P5 = p5Module.default;

      const sketch = (p: any) => {
        let bgVideo: any;
        let exitVideo: any;
        let bgVideoReady = false;
        let exitVideoReady = false;

        let figures: any[] = [];
        let activeFigure: any = null;

        const DESIGN_W = 1280;
        const DESIGN_H = 720;
        const SCALE_MODE = "cover";
        const MOBILE_BREAKPOINT = 768;

        let viewScale = 1;
        let offsetX = 0;
        let offsetY = 0;

        const APP_STATE = {
          IDLE: "idle",
          WINTER_SELECTED: "winterSelected",
          COLLAPSING: "collapsing",
          REVEALING: "revealing",
          DONE: "done",
        } as const;

        let appState = APP_STATE.IDLE;
        let stateStartTime = 0;
        let collapseStartTime = 0;
        let revealDuration = 1400;
        let webRevealTriggered = false;

        // 全部改成本地静态资源
        const BG_VIDEO_URL = "/intro/assets/entry.mp4";
        const EXIT_VIDEO_URL = "/intro/assets/exit.mp4";

        let exitDurationMs = 4000;

        const FIGURE_CONFIG_DESKTOP = [
          {
            name: "Researcher",
            figureFile: "/intro/assets/researcher.png",
            frameFile: "/intro/assets/researcherframe.png",
            frameX: 35,
            frameY: 360,
            frameH: 330,
            innerOffsetX: 24,
            innerOffsetY: 30,
            innerW: 85,
            innerH: 320,
          },
          {
            name: "Observer",
            figureFile: "/intro/assets/observer.png",
            frameFile: "/intro/assets/observerframe.png",
            frameX: 225,
            frameY: 320,
            frameH: 260,
            innerOffsetX: 18,
            innerOffsetY: 38,
            innerW: 70,
            innerH: 190,
          },
          {
            name: "Winter",
            figureFile: "/intro/assets/self_person.png",
            frameFile: "/intro/assets/selfframe.png",
            frameX: 520,
            frameY: 300,
            frameH: 355,
            innerOffsetX: 16,
            innerOffsetY: 48,
            innerW: 95,
            innerH: 300,
          },
          {
            name: "Designer",
            figureFile: "/intro/assets/designer.png",
            frameFile: "/intro/assets/designerframe.png",
            frameX: 785,
            frameY: 415,
            frameH: 300,
            innerOffsetX: 16,
            innerOffsetY: 50,
            innerW: 90,
            innerH: 250,
          },
          {
            name: "Reader",
            figureFile: "/intro/assets/reader.png",
            frameFile: "/intro/assets/readerframe.png",
            frameX: 1070,
            frameY: 380,
            frameH: 335,
            innerOffsetX: 20,
            innerOffsetY: 40,
            innerW: 95,
            innerH: 255,
          },
        ];

        const FIGURE_CONFIG_MOBILE = [
          {
            name: "Researcher",
            figureFile: "/intro/assets/researcher.png",
            frameFile: "/intro/assets/researcherframe.png",
            frameX: 80,
            frameY: 360,
            frameH: 250,
            innerOffsetX: 18,
            innerOffsetY: 28,
            innerW: 70,
            innerH: 220,
          },
          {
            name: "Observer",
            figureFile: "/intro/assets/observer.png",
            frameFile: "/intro/assets/observerframe.png",
            frameX: 290,
            frameY: 300,
            frameH: 220,
            innerOffsetX: 16,
            innerOffsetY: 30,
            innerW: 65,
            innerH: 165,
          },
          {
            name: "Winter",
            figureFile: "/intro/assets/self_person.png",
            frameFile: "/intro/assets/selfframe.png",
            frameX: 520,
            frameY: 220,
            frameH: 360,
            innerOffsetX: 16,
            innerOffsetY: 48,
            innerW: 95,
            innerH: 300,
          },
          {
            name: "Designer",
            figureFile: "/intro/assets/designer.png",
            frameFile: "/intro/assets/designerframe.png",
            frameX: 820,
            frameY: 330,
            frameH: 240,
            innerOffsetX: 16,
            innerOffsetY: 40,
            innerW: 78,
            innerH: 200,
          },
          {
            name: "Reader",
            figureFile: "/intro/assets/reader.png",
            frameFile: "/intro/assets/readerframe.png",
            frameX: 1030,
            frameY: 355,
            frameH: 255,
            innerOffsetX: 18,
            innerOffsetY: 35,
            innerW: 78,
            innerH: 205,
          },
        ];

        function isMobileView() {
          return p.width < MOBILE_BREAKPOINT;
        }

        function getFigureConfigs() {
          return isMobileView() ? FIGURE_CONFIG_MOBILE : FIGURE_CONFIG_DESKTOP;
        }

        function getMountSize() {
          const mountEl = mountRef.current;
          const cw = mountEl?.clientWidth || p.windowWidth;
          const ch = mountEl?.clientHeight || p.windowHeight;
          return { cw, ch };
        }

        function updateViewTransform() {
          if (SCALE_MODE === "cover") {
            viewScale = Math.max(p.width / DESIGN_W, p.height / DESIGN_H);
          } else {
            viewScale = Math.min(p.width / DESIGN_W, p.height / DESIGN_H);
          }

          offsetX = (p.width - DESIGN_W * viewScale) * 0.5;
          offsetY = (p.height - DESIGN_H * viewScale) * 0.5;
        }

        function getConfigByName(name: string) {
          return getFigureConfigs().find((cfg) => cfg.name === name);
        }

        function syncConfigAssets() {
          const assetMap = new Map();

          for (const cfg of FIGURE_CONFIG_DESKTOP as any[]) {
            assetMap.set(cfg.figureFile, cfg.figureImg);
            assetMap.set(cfg.frameFile, cfg.frameImg);
          }

          for (const cfg of FIGURE_CONFIG_MOBILE as any[]) {
            cfg.figureImg = assetMap.get(cfg.figureFile) || p.loadImage(cfg.figureFile);
            cfg.frameImg = assetMap.get(cfg.frameFile) || p.loadImage(cfg.frameFile);
          }
        }

        function rebuildFigures() {
          const prevByName = new Map();
          for (const fig of figures) prevByName.set(fig.name, fig);

          const newFigures = [];
          const configs = getFigureConfigs();

          for (const cfg of configs as any[]) {
            const fig = new Figure(cfg);
            const old = prevByName.get(cfg.name);

            if (old) {
              fig.hovered = old.hovered;
              fig.dragging = old.dragging;
              fig.returning = old.returning;
              fig.dragOffsetX = old.dragOffsetX;
              fig.dragOffsetY = old.dragOffsetY;
              fig.glitchStrength = old.glitchStrength;
              fig.shadowStrength = old.shadowStrength;
              fig.frameStrength = old.frameStrength;

              if (old.dragging || old.returning) {
                fig.x = old.x;
                fig.y = old.y;
              }
            }

            if (activeFigure && activeFigure.name === fig.name) {
              activeFigure = fig;
            }

            newFigures.push(fig);
          }

          figures = newFigures;
        }

        function configureVideo(
          video: any,
          {
            loop = false,
            onReady,
            onEnded,
          }: { loop?: boolean; onReady?: () => void; onEnded?: () => void } = {}
        ) {
          video.size(DESIGN_W, DESIGN_H);
          video.volume(0);
          video.hide();

          const el = video.elt;
          el.muted = true;
          el.defaultMuted = true;
          el.playsInline = true;
          el.setAttribute("muted", "");
          el.setAttribute("playsinline", "");
          el.setAttribute("webkit-playsinline", "");
          el.setAttribute("preload", "auto");
          el.setAttribute("crossorigin", "anonymous");

          if (loop) {
            el.loop = true;
            el.setAttribute("loop", "");
          }

          const markReady = () => {
            if (typeof onReady === "function") onReady();
          };

          el.addEventListener("loadeddata", markReady, { once: true });
          el.addEventListener("canplay", markReady, { once: true });

          if (typeof onEnded === "function") {
            el.addEventListener("ended", onEnded);
          }

          el.addEventListener("error", () => {
            console.error("Video load error:", el.currentSrc || el.src);
          });
        }

        function tryPlayVideo(video: any, shouldLoop = false) {
          if (!video || !video.elt) return;

          const el = video.elt;
          el.muted = true;
          el.playsInline = true;

          const playPromise = el.play();
          if (playPromise && typeof playPromise.then === "function") {
            playPromise
              .then(() => {
                if (shouldLoop) el.loop = true;
              })
              .catch((err: unknown) => {
                console.warn("Video autoplay failed:", err);
              });
          }
        }

        function ensureBgVideoPlaying() {
          if (!bgVideo || !bgVideoReady || !bgVideo.elt) return;

          const v = bgVideo.elt;
          if (v.paused || v.currentTime === 0) {
            tryPlayVideo(bgVideo, true);
          }
        }

        function unlockVideos() {
          if (bgVideo && bgVideoReady) {
            tryPlayVideo(bgVideo, true);
          }
        }

        function setupVideos() {
          bgVideo = p.createVideo([BG_VIDEO_URL]);
          configureVideo(bgVideo, {
            loop: true,
            onReady: () => {
              bgVideoReady = true;
              tryPlayVideo(bgVideo, true);
            },
          });

          exitVideo = p.createVideo([EXIT_VIDEO_URL]);
          configureVideo(exitVideo, {
            loop: false,
            onReady: () => {
              exitVideoReady = true;
              const d = exitVideo.elt.duration;
              if (Number.isFinite(d) && d > 0) {
                exitDurationMs = d * 1000;
              }
            },
            onEnded: () => {
              if (appState === APP_STATE.COLLAPSING) {
                appState = APP_STATE.REVEALING;
                stateStartTime = p.millis();
              }
            },
          });
        }

        function getFigureAlpha(fig: any) {
          if (appState === APP_STATE.IDLE) return 1;

          if (
            appState === APP_STATE.WINTER_SELECTED ||
            appState === APP_STATE.COLLAPSING
          ) {
            if (fig.name === "Winter") return 1;
            const t = p.constrain((p.millis() - stateStartTime) / 900, 0, 1);
            return 1 - t;
          }

          if (appState === APP_STATE.REVEALING) {
            return fig.name === "Winter" ? 1 : 0;
          }

          if (appState === APP_STATE.DONE) {
            return 0;
          }

          return 1;
        }

        function getWinterCollapseAlpha() {
          if (appState !== APP_STATE.COLLAPSING && appState !== APP_STATE.REVEALING) return 1;

          if (appState === APP_STATE.COLLAPSING) {
            let t = 0;
            if (
              exitVideo &&
              exitVideo.elt &&
              Number.isFinite(exitVideo.elt.duration) &&
              exitVideo.elt.duration > 0
            ) {
              t = p.constrain(exitVideo.elt.currentTime / exitVideo.elt.duration, 0, 1);
            } else {
              t = p.constrain((p.millis() - collapseStartTime) / exitDurationMs, 0, 1);
            }
            return 1 - t;
          }

          return 0;
        }

        function getWinterFrameDoorAlpha(fig: any) {
          if (fig.name !== "Winter") return 1;
          if (appState === APP_STATE.COLLAPSING) return 1;

          if (appState === APP_STATE.REVEALING) {
            const t = p.constrain((p.millis() - stateStartTime) / revealDuration, 0, 1);
            return 1 - t;
          }

          if (appState === APP_STATE.DONE) return 0;
          return 1;
        }

        function toDesignMouseX() {
          return (p.mouseX - offsetX) / viewScale;
        }

        function toDesignMouseY() {
          return (p.mouseY - offsetY) / viewScale;
        }

        function drawRevealDoorFade() {
          const t = p.constrain((p.millis() - stateStartTime) / revealDuration, 0, 1);
          p.noStroke();
          p.fill(0, 190 * t);
          p.rect(0, 0, DESIGN_W, DESIGN_H);
        }

        function drawBackgroundVideo() {
          if (appState === APP_STATE.COLLAPSING) {
            if (exitVideoReady) {
              p.image(exitVideo, 0, 0, DESIGN_W, DESIGN_H);
            } else {
              p.background(0);
            }

            let t = 0;
            if (
              exitVideo &&
              exitVideo.elt &&
              Number.isFinite(exitVideo.elt.duration) &&
              exitVideo.elt.duration > 0
            ) {
              t = p.constrain(exitVideo.elt.currentTime / exitVideo.elt.duration, 0, 1);
            } else {
              t = p.constrain((p.millis() - collapseStartTime) / exitDurationMs, 0, 1);
            }

            p.noStroke();
            p.fill(0, 120 * Math.pow(t, 1.3));
            p.rect(0, 0, DESIGN_W, DESIGN_H);
            return;
          }

          if (appState === APP_STATE.REVEALING || appState === APP_STATE.DONE) {
            p.background(0);
            return;
          }

          if (bgVideoReady) {
            p.image(bgVideo, 0, 0, DESIGN_W, DESIGN_H);
          } else {
            p.background(0);
          }
        }

        function updateAppState() {
          if (appState === APP_STATE.COLLAPSING) {
            if (exitVideo && exitVideo.elt && exitVideoReady) {
              const dur = exitVideo.elt.duration;
              const cur = exitVideo.elt.currentTime;

              if (Number.isFinite(dur) && dur > 0 && cur >= dur - 0.03) {
                appState = APP_STATE.REVEALING;
                stateStartTime = p.millis();
                exitVideo.pause();
              } else {
                const elapsed = p.millis() - collapseStartTime;
                if (elapsed >= exitDurationMs) {
                  appState = APP_STATE.REVEALING;
                  stateStartTime = p.millis();
                  exitVideo.pause();
                }
              }
            }
          }

          if (appState === APP_STATE.REVEALING) {
            const elapsed = p.millis() - stateStartTime;
            if (elapsed >= revealDuration) {
              appState = APP_STATE.DONE;
            }
          }
        }

        function beginPointerInteraction(px: number, py: number) {
          ensureBgVideoPlaying();

          if (!(appState === APP_STATE.IDLE || appState === APP_STATE.WINTER_SELECTED)) return;
          if (px < 0 || px > DESIGN_W || py < 0 || py > DESIGN_H) return;

          for (let i = figures.length - 1; i >= 0; i--) {
            const fig = figures[i];
            if (fig.hitTest(px, py)) {
              activeFigure = fig;
              fig.dragging = true;
              fig.returning = false;
              fig.shadowStrength = 0;
              fig.dragOffsetX = px - fig.x;
              fig.dragOffsetY = py - fig.y;

              for (const other of figures) other.hovered = false;
              fig.hovered = true;

              figures.splice(i, 1);
              figures.push(fig);
              break;
            }
          }
        }

        function movePointerInteraction(px: number, py: number) {
          if (!activeFigure) return;

          activeFigure.x = px - activeFigure.dragOffsetX;
          activeFigure.y = py - activeFigure.dragOffsetY;

          if (activeFigure.name === "Winter" && appState === APP_STATE.IDLE) {
            appState = APP_STATE.WINTER_SELECTED;
            stateStartTime = p.millis();
          }

          if (
            activeFigure.name === "Winter" &&
            appState === APP_STATE.WINTER_SELECTED
          ) {
            const d = p.dist(
              activeFigure.x,
              activeFigure.y,
              activeFigure.anchorX,
              activeFigure.anchorY
            );
            if (d > 40) {
              appState = APP_STATE.COLLAPSING;
              collapseStartTime = p.millis();

              if (exitVideo && exitVideoReady) {
                try {
                  exitVideo.pause();
                  exitVideo.time(0);
                } catch {}

                tryPlayVideo(exitVideo, false);
              }

              activeFigure.dragging = false;
              activeFigure.returning = false;
              activeFigure.shadowStrength = 0;
              activeFigure = null;
            }
          }
        }

        function endPointerInteraction() {
          if (activeFigure) {
            activeFigure.dragging = false;
            activeFigure.returning = true;
            activeFigure = null;
          }
        }

        class Figure {
          name: string;
          figureImg: any;
          frameImg: any;
          frameX: number;
          frameY: number;
          frameH: number;
          frameW: number;
          innerOffsetX: number;
          innerOffsetY: number;
          innerW: number;
          innerH: number;
          hovered = false;
          dragging = false;
          returning = false;
          dragOffsetX = 0;
          dragOffsetY = 0;
          glitchStrength = 0;
          shadowStrength = 0;
          frameStrength = 0;
          alphaThreshold = 20;
          x = 0;
          y = 0;
          centerX = 0;
          centerY = 0;
          figureW = 0;
          figureH = 0;
          anchorX = 0;
          anchorY = 0;

          constructor(cfg: any) {
            this.applyConfig(cfg);
            this.figureImg.loadPixels();
            this.updateFigurePlacement();
            this.anchorX = this.x;
            this.anchorY = this.y;
          }

          applyConfig(cfg: any) {
            this.name = cfg.name;
            this.figureImg = cfg.figureImg;
            this.frameImg = cfg.frameImg;
            this.frameX = cfg.frameX;
            this.frameY = cfg.frameY;
            this.frameH = cfg.frameH;

            const frameAspect = this.frameImg.width / this.frameImg.height;
            this.frameW = this.frameH * frameAspect;

            this.innerOffsetX = cfg.innerOffsetX;
            this.innerOffsetY = cfg.innerOffsetY;
            this.innerW = cfg.innerW;
            this.innerH = cfg.innerH;
          }

          updateFigurePlacement() {
            const areaX = this.frameX + this.innerOffsetX;
            const areaY = this.frameY + this.innerOffsetY;
            const areaW = this.innerW;
            const areaH = this.innerH;

            const imgAspect = this.figureImg.width / this.figureImg.height;
            const areaAspect = areaW / areaH;

            if (imgAspect > areaAspect) {
              this.figureW = areaW;
              this.figureH = areaW / imgAspect;
            } else {
              this.figureH = areaH;
              this.figureW = areaH * imgAspect;
            }

            this.centerX = areaX + areaW / 2;
            this.centerY = areaY + areaH / 2;

            if (!this.dragging && !this.returning) {
              this.x = this.centerX - this.figureW / 2;
              this.y = this.centerY - this.figureH / 2;
              this.anchorX = this.x;
              this.anchorY = this.y;
            }
          }

          updateReturn() {
            if (!this.dragging && this.returning) {
              const targetX = this.centerX - this.figureW / 2;
              const targetY = this.centerY - this.figureH / 2;

              this.x = p.lerp(this.x, targetX, 0.55);
              this.y = p.lerp(this.y, targetY, 0.55);

              const d = p.dist(this.x, this.y, targetX, targetY);
              if (d < 20) this.glitchStrength *= 0.7;

              if (d < 0.8) {
                this.x = targetX;
                this.y = targetY;
                this.returning = false;
                this.glitchStrength = 0;
              }
            }
          }

          updateEffects() {
            const targetX = this.centerX - this.figureW / 2;
            const targetY = this.centerY - this.figureH / 2;
            const d = p.dist(this.x, this.y, targetX, targetY);

            let targetGlitch = 0;
            if (this.hovered) targetGlitch += 0.18;
            if (this.dragging) targetGlitch += 0.95;
            if (this.returning) targetGlitch += 0.08;
            targetGlitch += p.constrain(p.map(d, 0, 220, 0, 0.35), 0, 0.35);

            let targetShadow = 0;
            if (this.dragging || this.returning) {
              targetShadow = p.constrain(p.map(d, 0, 220, 0.2, 1.0), 0.2, 1.0);
            }

            let targetFrame = 0.15;
            if (this.hovered) targetFrame = 1.2;
            if (this.dragging) targetFrame = 1.35;
            if (this.returning) targetFrame = 0.6;

            if (this.name === "Winter" && appState === APP_STATE.COLLAPSING) {
              targetFrame = 1.6;
              targetGlitch += 0.55;
            }

            if (this.name === "Winter" && appState === APP_STATE.REVEALING) {
              targetFrame = 1.1;
            }

            this.glitchStrength = p.lerp(this.glitchStrength, targetGlitch, 0.28);
            this.shadowStrength = p.lerp(this.shadowStrength, targetShadow, 0.2);
            this.frameStrength = p.lerp(this.frameStrength, targetFrame, 0.2);
          }

          hitTest(px: number, py: number) {
            if (
              px < this.x ||
              px > this.x + this.figureW ||
              py < this.y ||
              py > this.y + this.figureH
            ) {
              return false;
            }

            const ix = Math.floor(
              p.map(px, this.x, this.x + this.figureW, 0, this.figureImg.width)
            );
            const iy = Math.floor(
              p.map(py, this.y, this.y + this.figureH, 0, this.figureImg.height)
            );

            const cx = p.constrain(ix, 0, this.figureImg.width - 1);
            const cy = p.constrain(iy, 0, this.figureImg.height - 1);
            const idx = 4 * (cy * this.figureImg.width + cx);
            const alpha = this.figureImg.pixels[idx + 3];

            return alpha > this.alphaThreshold;
          }

          drawDesignerWhiteSilhouette(alphaMul = 1) {
            p.push();
            p.blendMode(p.BLEND);
            p.tint(255, 255, 255, 150 * alphaMul);
            p.image(this.figureImg, this.x, this.y, this.figureW, this.figureH);

            p.blendMode(p.SCREEN);
            p.tint(255, 255, 255, 90 * alphaMul);
            p.image(this.figureImg, this.x, this.y, this.figureW, this.figureH);

            p.tint(220, 240, 255, 55 * alphaMul);
            p.image(this.figureImg, this.x - 1.5, this.y - 1, this.figureW, this.figureH);

            p.blendMode(p.ADD);
            p.tint(255, 255, 255, 28 * alphaMul);
            p.image(this.figureImg, this.x + 1, this.y, this.figureW, this.figureH);

            p.blendMode(p.BLEND);
            p.noTint();
            p.pop();
          }

          drawDesignerSliceWhiteSilhouette(dx: number, dy: number, sy: number, sliceH: number, alphaMul = 1) {
            const dh = sliceH * (this.figureH / this.figureImg.height);
            p.push();

            p.blendMode(p.BLEND);
            p.tint(255, 255, 255, 145 * alphaMul);
            p.image(this.figureImg, dx, dy, this.figureW, dh, 0, sy, this.figureImg.width, sliceH);

            p.blendMode(p.SCREEN);
            p.tint(255, 255, 255, 85 * alphaMul);
            p.image(this.figureImg, dx - 1, dy, this.figureW, dh, 0, sy, this.figureImg.width, sliceH);

            p.tint(220, 240, 255, 45 * alphaMul);
            p.image(this.figureImg, dx + 1, dy, this.figureW, dh, 0, sy, this.figureImg.width, sliceH);

            p.blendMode(p.BLEND);
            p.noTint();
            p.pop();
          }

          drawWinterPersonOnlyGlitch(alphaMul = 1) {
            const winterAlpha = alphaMul * getWinterCollapseAlpha();
            if (winterAlpha <= 0.01) return;

            const g = this.glitchStrength;
            if (g < 0.06) {
              p.tint(255, 255 * winterAlpha);
              p.image(this.figureImg, this.x, this.y, this.figureW, this.figureH);
              p.noTint();
              return;
            }

            const slices = 22;
            const sliceH = this.figureImg.height / slices;
            const amp = 1 + g * 12;

            p.push();

            for (let i = 0; i < slices; i++) {
              const sy = i * sliceH;
              const dx = this.x + p.random(-amp, amp);
              const dy = this.y + sy * (this.figureH / this.figureImg.height) + p.random(-1.1, 1.1);

              p.tint(255, 255 * winterAlpha);
              p.image(
                this.figureImg,
                dx,
                dy,
                this.figureW,
                sliceH * (this.figureH / this.figureImg.height),
                0,
                sy,
                this.figureImg.width,
                sliceH
              );
              p.noTint();
            }

            p.tint(255, 60, 80, 45 * winterAlpha);
            p.image(this.figureImg, this.x - 3, this.y, this.figureW, this.figureH);

            p.tint(60, 200, 255, 45 * winterAlpha);
            p.image(this.figureImg, this.x + 3, this.y, this.figureW, this.figureH);

            p.tint(255, 255, 255, 24 * winterAlpha);
            p.image(this.figureImg, this.x, this.y - 1, this.figureW, this.figureH);

            p.noTint();
            p.pop();
          }

          drawFigure() {
            const alphaMul = getFigureAlpha(this);
            if (alphaMul <= 0.01) return;

            const isWinter = this.name === "Winter";
            const isDesigner = this.name === "Designer";
            const g = this.glitchStrength;

            if (isWinter) {
              this.drawWinterPersonOnlyGlitch(alphaMul);
              return;
            }

            if (g < 0.06) {
              if (isDesigner) {
                this.drawDesignerWhiteSilhouette(alphaMul);
              } else {
                p.tint(255, 255 * alphaMul);
                p.image(this.figureImg, this.x, this.y, this.figureW, this.figureH);
                p.noTint();
              }
              return;
            }

            const slices = 24;
            const sliceH = this.figureImg.height / slices;
            const amp = 2 + g * 14;

            p.push();

            for (let i = 0; i < slices; i++) {
              const sy = i * sliceH;
              const dx = this.x + p.random(-amp, amp);
              const dy = this.y + sy * (this.figureH / this.figureImg.height) + p.random(-1, 1);

              if (isDesigner) {
                this.drawDesignerSliceWhiteSilhouette(dx, dy, sy, sliceH, alphaMul);
              } else {
                p.tint(255, 255 * alphaMul);
                p.image(
                  this.figureImg,
                  dx,
                  dy,
                  this.figureW,
                  sliceH * (this.figureH / this.figureImg.height),
                  0,
                  sy,
                  this.figureImg.width,
                  sliceH
                );
                p.noTint();
              }
            }

            if (!isDesigner) {
              p.tint(255, 60, 60, 55 * alphaMul);
              p.image(this.figureImg, this.x - 2, this.y, this.figureW, this.figureH);

              p.tint(60, 180, 255, 55 * alphaMul);
              p.image(this.figureImg, this.x + 2, this.y, this.figureW, this.figureH);

              p.tint(255, 35 * alphaMul);
              p.image(
                this.figureImg,
                p.lerp(this.anchorX, this.x, 0.35),
                p.lerp(this.anchorY, this.y, 0.35),
                this.figureW,
                this.figureH
              );
            } else {
              p.blendMode(p.SCREEN);
              p.tint(255, 255, 255, 45 * alphaMul);
              p.image(this.figureImg, this.x - 1, this.y, this.figureW, this.figureH);

              p.blendMode(p.ADD);
              p.tint(220, 240, 255, 25 * alphaMul);
              p.image(this.figureImg, this.x + 1, this.y, this.figureW, this.figureH);

              p.blendMode(p.BLEND);
            }

            p.noTint();
            p.pop();
          }

          drawShadow() {
            const alphaMul = getFigureAlpha(this);
            if (alphaMul <= 0.01 || this.shadowStrength < 0.03) return;

            const s = this.shadowStrength * alphaMul;
            p.push();

            p.tint(0, 235 * s);
            p.image(this.figureImg, this.anchorX, this.anchorY, this.figureW, this.figureH);

            p.tint(0, 120 * s);
            p.image(this.figureImg, this.anchorX + 0.5, this.anchorY + 0.5, this.figureW, this.figureH);

            p.noTint();
            p.pop();
          }

          drawFrame() {
            let alphaMul = getFigureAlpha(this);
            if (this.name === "Winter") alphaMul *= getWinterFrameDoorAlpha(this);
            if (alphaMul <= 0.01) return;

            p.push();

            p.tint(255, 210 * alphaMul);
            p.image(this.frameImg, this.frameX, this.frameY, this.frameW, this.frameH);

            const flicker = this.frameStrength;
            if (flicker > 0.02) {
              const n = p.noise(p.frameCount * 0.12 + this.frameX * 0.01);
              const flashAlpha = p.map(n, 0, 1, 170, 255) * flicker * alphaMul;

              for (let i = 0; i < 6; i++) {
                const spread = 2 + i * 2.2;
                const glowAlpha = Math.max(8, 30 - i * 4) * flicker * alphaMul;

                p.tint(80, 220, 255, glowAlpha);
                p.image(
                  this.frameImg,
                  this.frameX - spread,
                  this.frameY - spread,
                  this.frameW + spread * 2,
                  this.frameH + spread * 2
                );
              }

              for (let i = 0; i < 3; i++) {
                const jitterX = p.random(-1.8, 1.8) * flicker;
                const jitterY = p.random(-1.8, 1.8) * flicker;

                p.tint(110, 240, 255, flashAlpha);
                p.image(this.frameImg, this.frameX + jitterX, this.frameY + jitterY, this.frameW, this.frameH);
              }

              p.tint(200, 255, 255, 120 * flicker * alphaMul);
              p.image(this.frameImg, this.frameX, this.frameY, this.frameW, this.frameH);

              const scanY =
                this.frameY +
                (Math.sin(p.frameCount * 0.12 + this.frameX * 0.02) * 0.5 + 0.5) * this.frameH;

              p.noStroke();
              p.fill(120, 240, 255, 50 * flicker * alphaMul);
              p.rect(this.frameX + 4, scanY, this.frameW - 8, 3);
            }

            p.noTint();
            p.pop();
          }
        }

        p.preload = () => {
          const merged = [...FIGURE_CONFIG_DESKTOP, ...FIGURE_CONFIG_MOBILE];
          const loaded = new Set<string>();

          for (const cfg of merged as any[]) {
            if (!loaded.has(cfg.figureFile)) {
              cfg.figureImg = p.loadImage(cfg.figureFile);
              loaded.add(cfg.figureFile);
            }
            if (!loaded.has(cfg.frameFile)) {
              cfg.frameImg = p.loadImage(cfg.frameFile);
              loaded.add(cfg.frameFile);
            }
          }

          syncConfigAssets();
        };

        p.setup = () => {
          const { cw, ch } = getMountSize();
          const cnv = p.createCanvas(cw, ch);
          cnv.parent(mountRef.current as HTMLDivElement);

          p.pixelDensity(1);
          updateViewTransform();
          setupVideos();
          rebuildFigures();

          window.addEventListener("pointerdown", unlockVideos, { passive: true });
          window.addEventListener("touchstart", unlockVideos, { passive: true });
        };

        p.windowResized = () => {
          const prevMobile = isMobileView();
          const { cw, ch } = getMountSize();

          p.resizeCanvas(cw, ch);
          updateViewTransform();

          const nextMobile = isMobileView();
          if (prevMobile !== nextMobile) {
            rebuildFigures();
          } else {
            for (const fig of figures) {
              fig.applyConfig(getConfigByName(fig.name));
            }
          }
        };

        p.draw = () => {
          updateAppState();
          p.background(0);

          p.push();
          p.translate(offsetX, offsetY);
          p.scale(viewScale);

          drawBackgroundVideo();

          for (const fig of figures) {
            fig.updateFigurePlacement();
            fig.updateReturn();
            fig.hovered = false;
          }

          const mx = toDesignMouseX();
          const my = toDesignMouseY();

          if (appState === APP_STATE.IDLE || appState === APP_STATE.WINTER_SELECTED) {
            for (let i = figures.length - 1; i >= 0; i--) {
              const fig = figures[i];
              if (fig.dragging || fig.hitTest(mx, my)) {
                fig.hovered = true;
                break;
              }
            }
          } else if (activeFigure) {
            activeFigure.hovered = true;
          }

          for (const fig of figures) fig.updateEffects();
          for (const fig of figures) fig.drawShadow();
          for (const fig of figures) fig.drawFrame();
          for (const fig of figures) {
            if (fig !== activeFigure) fig.drawFigure();
          }
          if (activeFigure) activeFigure.drawFigure();

          if (appState === APP_STATE.REVEALING) {
            drawRevealDoorFade();
          }

          p.pop();

          if (appState === APP_STATE.DONE && !webRevealTriggered) {
            webRevealTriggered = true;
            finishedRef.current = true;
            onFinish();
          }
        };

        p.mousePressed = () => beginPointerInteraction(toDesignMouseX(), toDesignMouseY());
        p.mouseDragged = () => movePointerInteraction(toDesignMouseX(), toDesignMouseY());
        p.mouseReleased = () => endPointerInteraction();

        p.touchStarted = () => {
          beginPointerInteraction(toDesignMouseX(), toDesignMouseY());
          return false;
        };
        p.touchMoved = () => {
          movePointerInteraction(toDesignMouseX(), toDesignMouseY());
          return false;
        };
        p.touchEnded = () => {
          endPointerInteraction();
          return false;
        };
      };

      if (!cancelled && mountRef.current) {
        p5Instance = new P5(sketch, mountRef.current);
      }
    }

    init();

    return () => {
      cancelled = true;
      if (p5Instance) {
        p5Instance.remove();
      }
    };
  }, [onFinish]);

  return <div ref={mountRef} className="intro-canvas-wrap" />;
}
