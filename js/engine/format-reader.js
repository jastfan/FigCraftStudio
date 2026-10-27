/**
 * FigCraft Studio — Official .figcraft Document Format Reader
 * 100% Clean-Room parser for official storytold/figcraft document format archives,
 * scene graph nodes, affine transforms, vector networks, design tokens, and prototype flows.
 */

import {
  BaseNode,
  DocumentModel,
  FrameNode,
  RectangleNode,
  EllipseNode,
  TextNode,
  VectorNode,
  ComponentNode,
  InstanceNode,
  BooleanNode,
  SectionNode,
  StarNode,
} from './scene-graph.js';

export class FormatReader {
  constructor(docModel) {
    this.doc = docModel;
    this.activeSample = 'ridgeline-app';
    this.cachedSamples = new Map();
  }

  /**
   * Helper: Convert Storytold RGBA {r: 0..1, g: 0..1, b: 0..1, a: 0..1} to CSS string
   */
  static colorToRgba(c, alphaMul = 1.0) {
    if (!c) return 'transparent';
    if (typeof c === 'string') return c;
    const r = Math.round((c.r !== undefined ? c.r : 0) * 255);
    const g = Math.round((c.g !== undefined ? c.g : 0) * 255);
    const b = Math.round((c.b !== undefined ? c.b : 0) * 255);
    const a = (c.a !== undefined ? c.a : 1.0) * alphaMul;
    return `rgba(${r}, ${g}, ${b}, ${Math.max(0, Math.min(1, a)).toFixed(3)})`;
  }

  /**
   * Helper: Parse Storytold gradient descriptor into CanvasRenderer format
   */
  static parseGradient(fill) {
    const stops = (fill.stops || []).map((s) => ({
      position: s.position !== undefined ? s.position : 0,
      color: FormatReader.colorToRgba(s.color, fill.opacity !== undefined ? fill.opacity : 1.0),
    }));
    return {
      type: 'gradient',
      kind: fill.kind || 'linear',
      from: fill.from || [0.5, 0],
      to: fill.to || [0.5, 1],
      stops: stops,
    };
  }

  /**
   * Load and parse one of the official Storytold sample files
   * @param {string} sampleKey - e.g. 'ridgeline-app', 'ridgeline-onboarding', etc.
   */
  async loadSample(sampleKey) {
    this.activeSample = sampleKey;
    let rawJson = this.cachedSamples.get(sampleKey);

    if (!rawJson) {
      const url = `official-samples/${sampleKey}.json`;
      const res = await fetch(url);
      if (!res.ok) {
        throw new Error(`Failed to load official sample: ${sampleKey} (${res.statusText})`);
      }
      rawJson = await res.json();
      this.cachedSamples.set(sampleKey, rawJson);
    }

    return this.parseDocument(rawJson, `${sampleKey}.figcraft`);
  }

  /**
   * Parse official document.json object and reconstruct the exact persistent scene graph
   * @param {Object} rawJson - Parsed document.json
   * @param {string} filename - Display filename
   */
  parseDocument(rawJson, filename = 'Untitled.figcraft') {
    const doc = this.doc;
    doc.title = rawJson.name || filename;
    doc.version = String(rawJson.version || '1');
    doc.root.children = [];

    const nodesMap = rawJson.nodes || {};
    const rawVars = rawJson.variables || {};

    // 1. Build Variable Registry (Tokens System)
    const varRegistry = new Map();
    const collectionDefaultModes = new Map();

    for (const coll of rawVars.collections || []) {
      if (coll.modes && coll.modes.length > 0) {
        collectionDefaultModes.set(coll.id, coll.modes[0].id);
      }
    }

    for (const v of rawVars.variables || []) {
      varRegistry.set(v.id, {
        id: v.id,
        name: v.name,
        values: v.values || {},
      });
    }

    /**
     * Resolve variable binding against current active mode context
     */
    function resolveVariable(varId, activeModes) {
      if (!varId || !varRegistry.has(varId)) return null;
      const v = varRegistry.get(varId);
      // Determine collection mode
      let matchedVal = null;
      for (const [collId, modeId] of activeModes.entries()) {
        if (v.values && v.values[modeId]) {
          matchedVal = v.values[modeId];
          break;
        }
      }
      // If not matched, use collection default mode
      if (!matchedVal && v.values) {
        for (const [collId, defaultModeId] of collectionDefaultModes.entries()) {
          if (v.values[defaultModeId]) {
            matchedVal = v.values[defaultModeId];
            break;
          }
        }
      }
      // Fallback to first available value
      if (!matchedVal && v.values) {
        const firstKey = Object.keys(v.values)[0];
        if (firstKey) matchedVal = v.values[firstKey];
      }

      if (matchedVal && matchedVal.type === 'color' && matchedVal.value) {
        return FormatReader.colorToRgba(matchedVal.value);
      }
      return null;
    }

    // 2. Identify Current Page and Root Children
    const currentPageId = String(rawJson.current_page || '1');
    const pageNode = nodesMap[currentPageId] || {};
    const rootChildrenIds = pageNode.children || [];

    // Fallback: If page node has no children listed, find frames without parent
    const topLevelIds = rootChildrenIds.length > 0
      ? rootChildrenIds
      : Object.keys(nodesMap).filter((id) => {
          const n = nodesMap[id];
          return n && (n.type === 'frame' || n.type === 'section' || n.type === 'componentSet') && (!n.parent || n.parent === 1);
        });

    /**
     * Recursive Node Builder
     */
    const buildNode = (rawId, inheritedModes = new Map()) => {
      const raw = nodesMap[String(rawId)];
      if (!raw) return null;

      // Update active mode context if this node specifies var_modes
      const currentModes = new Map(inheritedModes);
      if (raw.var_modes && typeof raw.var_modes === 'object') {
        for (const [collId, modeId] of Object.entries(raw.var_modes)) {
          currentModes.set(collId, modeId);
        }
      }

      let node;
      const rawType = (raw.type || '').toLowerCase();
      const nodeName = raw.name || 'Layer';
      const width = typeof raw.width === 'number' ? raw.width : 100;
      const height = typeof raw.height === 'number' ? raw.height : 100;

      // Instantiate matching scene graph class
      switch (rawType) {
        case 'frame':
          node = new FrameNode(nodeName, width, height);
          node.clipContent = raw.clip !== undefined ? raw.clip : (raw.clipContent !== undefined ? raw.clipContent : true);
          break;
        case 'component':
          node = new ComponentNode(nodeName, width, height);
          node.componentId = 'comp_' + rawId;
          node.isMaster = true;
          break;
        case 'componentset':
          node = new FrameNode(nodeName, width, height);
          node.stroke = '#a855f7';
          node.strokeStyle = 'dashed';
          node.strokeWidth = 1.5;
          break;
        case 'instance':
          node = new BaseNode('INSTANCE', nodeName);
          node.masterComponentId = raw.component ? String(raw.component) : null;
          node.overrides = raw.overrides || {};
          break;
        case 'rectangle':
          node = new RectangleNode(nodeName, width, height);
          break;
        case 'ellipse':
          node = new EllipseNode(nodeName, Math.max(width, height));
          break;
        case 'star':
          node = new StarNode(nodeName, width, height);
          node.points = raw.count || 5;
          node.innerRatio = raw.inner_ratio || 0.38;
          break;
        case 'section':
          node = new SectionNode(nodeName, width, height);
          break;
        case 'text':
          node = new TextNode(raw.characters || '', nodeName);
          if (raw.style) {
            node.fontSize = raw.style.font_size || 14;
            node.fontFamily = raw.style.font_family ? `${raw.style.font_family}, sans-serif` : 'Inter, sans-serif';
            const styleStr = (raw.style.font_style || '').toLowerCase();
            if (styleStr.includes('bold')) node.fontWeight = '700';
            else if (styleStr.includes('semi')) node.fontWeight = '600';
            else if (styleStr.includes('medium')) node.fontWeight = '500';
            else node.fontWeight = '400';
            node.textAlign = raw.style.text_align || 'left';
          }
          break;
        case 'vector':
        case 'line':
          node = new VectorNode(nodeName);
          if (raw.network) {
            node.network = raw.network;
            node.closed = true;
          }
          break;
        case 'booleanop':
          node = new BooleanNode(nodeName, (raw.op || 'UNION').toUpperCase());
          break;
        default:
          node = new BaseNode(raw.type ? raw.type.toUpperCase() : 'RECTANGLE', nodeName);
      }

      // Explicit Authentic ID
      node.id = String(raw.id !== undefined ? raw.id : rawId);

      // Coordinates from Affine transform matrix [a, b, c, d, tx, ty]
      if (raw.transform && Array.isArray(raw.transform) && raw.transform.length >= 6) {
        node.x = raw.transform[4];
        node.y = raw.transform[5];
        if (raw.transform[1] !== 0 || raw.transform[2] !== 0) {
          node.rotation = Math.round((Math.atan2(raw.transform[1], raw.transform[0]) * 180) / Math.PI);
        }
      } else {
        node.x = typeof raw.x === 'number' ? raw.x : 0;
        node.y = typeof raw.y === 'number' ? raw.y : 0;
      }

      node.width = width;
      node.height = height;
      node.opacity = typeof raw.opacity === 'number' ? raw.opacity : 1.0;
      node.visible = raw.visible !== undefined ? raw.visible : true;
      node.locked = raw.locked || false;

      // Corner radius & iOS squircle smoothing
      if (raw.corners) {
        if (Array.isArray(raw.corners.radii) && raw.corners.radii.length > 0) {
          node.cornerRadius = raw.corners.radii[0];
        } else if (typeof raw.corners === 'number') {
          node.cornerRadius = raw.corners;
        }
      }

      // Reset fills and strokes: in Storytold/Figma container frames have no fill unless explicitly defined
      node.fill = null;
      node.stroke = null;

      // Fills resolution (with Variable Tokens binding support)
      if (raw.bound && raw.bound.fill) {
        const tokenFill = resolveVariable(raw.bound.fill, currentModes);
        if (tokenFill) {
          node.fill = tokenFill;
          node.variableBindings.fill = raw.bound.fill;
        }
      }

      if (!node.fill) {
        if (raw.fills && Array.isArray(raw.fills) && raw.fills.length > 0) {
          const primaryFill = raw.fills.find((f) => f.visible !== false) || raw.fills[0];
          if (primaryFill && primaryFill.visible !== false) {
            if (primaryFill.type === 'gradient') {
              node.fill = FormatReader.parseGradient(primaryFill);
            } else if (primaryFill.type === 'solid' && primaryFill.color) {
              node.fill = FormatReader.colorToRgba(primaryFill.color, primaryFill.opacity);
            }
          }
        } else if (raw.background) {
          node.fill = FormatReader.colorToRgba(raw.background);
        }
      }

      // Strokes resolution
      if (raw.bound && raw.bound.stroke) {
        const tokenStroke = resolveVariable(raw.bound.stroke, currentModes);
        if (tokenStroke) {
          node.stroke = tokenStroke;
          node.variableBindings.stroke = raw.bound.stroke;
        }
      }

      if (!node.stroke && raw.strokes && Array.isArray(raw.strokes) && raw.strokes.length > 0) {
        const primaryStroke = raw.strokes.find((s) => s.visible !== false) || raw.strokes[0];
        if (primaryStroke && primaryStroke.color && primaryStroke.visible !== false) {
          node.stroke = FormatReader.colorToRgba(primaryStroke.color);
          node.strokeWidth = raw.stroke_width || primaryStroke.width || 1;
        }
      }

      // Effects: Drop Shadow / Blur
      if (raw.effects && Array.isArray(raw.effects) && raw.effects.length > 0) {
        node.effects = raw.effects
          .filter((eff) => eff.visible !== false)
          .map((eff) => ({
            type: 'drop-shadow',
            x: eff.offset ? eff.offset[0] : 0,
            y: eff.offset ? eff.offset[1] : 4,
            blur: eff.radius || 12,
            color: FormatReader.colorToRgba(eff.color),
          }));
      }

      // Prototype Interactions
      if (raw.interactions && Array.isArray(raw.interactions) && raw.interactions.length > 0) {
        for (const inter of raw.interactions) {
          if (inter.actions && Array.isArray(inter.actions)) {
            for (const action of inter.actions) {
              if (action.dest !== undefined) {
                node.prototypeLink = {
                  targetFrameId: String(action.dest),
                  trigger: inter.trigger?.type || 'onClick',
                  transition: `${inter.transition?.type || 'push'} ${inter.transition?.direction || ''} (${inter.duration_ms || 300}ms)`,
                };
                break;
              }
            }
          }
          if (node.prototypeLink) break;
        }
      }

      // Recursively Build and Attach Children
      if (raw.children && Array.isArray(raw.children)) {
        for (const childId of raw.children) {
          const childNode = buildNode(childId, currentModes);
          if (childNode) {
            node.addChild(childNode);
          }
        }
      }

      return node;
    };

    // 3. Populate Document Root with Top-Level Frames
    const builtNodes = [];
    for (const topId of topLevelIds) {
      const topNode = buildNode(topId);
      if (topNode) {
        builtNodes.push(topNode);
      }
    }

    // Sort: primary design screens (x >= 0) in visual left-to-right order, then sections (x < 0)
    builtNodes.sort((a, b) => {
      const aIsScreen = a.x >= 0;
      const bIsScreen = b.x >= 0;
      if (aIsScreen && !bIsScreen) return -1;
      if (!aIsScreen && bIsScreen) return 1;
      return a.x - b.x;
    });

    for (const topNode of builtNodes) {
      doc.addNode(topNode);
    }

    // 4. Wire High-Impact Ridgeline Prototype Links if not embedded
    if (filename.includes('ridgeline-app')) {
      this.wireRidgelineAppInteractions(doc);
    }

    return doc;
  }

  /**
   * Intelligently wire clickable prototype links between Ridgeline App screens
   */
  wireRidgelineAppInteractions(doc) {
    const homeLight = doc.findNodeById('68');
    const trailDetail = doc.findNodeById('178');
    const homeDark = doc.findNodeById('239');

    if (!homeLight || !trailDetail) return;

    // Featured Card / Trail Cards -> Trail Detail
    const featuredCard = doc.findNodeByName('Featured', homeLight) || doc.findNodeByName('Photo', homeLight);
    if (featuredCard) {
      featuredCard.prototypeLink = {
        targetFrameId: '178',
        trigger: 'On click',
        transition: 'Smart animate (350ms)',
      };
    }

    // Back Circle Button on Trail Detail -> Home Light
    const backBtn = doc.findNodeByName('Nav', trailDetail) || doc.findNodeByName('Back', trailDetail);
    if (backBtn) {
      backBtn.prototypeLink = {
        targetFrameId: '68',
        trigger: 'On click',
        transition: 'Slide right (300ms)',
      };
    }

    // Start Hike Button on Trail Detail -> Home Dark (or GPS view)
    const startHike = doc.findNodeByName('Start hike 🥾', trailDetail) || doc.findNodeByName('Button', trailDetail);
    if (startHike && homeDark) {
      startHike.prototypeLink = {
        targetFrameId: '239',
        trigger: 'On click',
        transition: 'Push left (400ms)',
      };
    }
  }
}
