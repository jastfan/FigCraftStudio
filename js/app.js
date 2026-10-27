/**
 * FigCraft Studio — Main Application Controller
 * Connects canvas renderer, transform controller, inspector, layers,
 * command palette, token variables, boolean operations, and prototype runner.
 */

import {
  DocumentModel,
  FrameNode,
  RectangleNode,
  EllipseNode,
  TextNode,
  VectorNode,
  ComponentNode,
  InstanceNode,
  BooleanNode,
} from './engine/scene-graph.js';
import { CanvasRenderer } from './engine/canvas-renderer.js';
import { TransformController } from './engine/transform-controller.js';
import { AutoLayoutEngine } from './engine/auto-layout.js';
import { ExportEngine } from './engine/export-engine.js';
import { PrototypeRunner } from './engine/prototype-runner.js';
import { FormatReader } from './engine/format-reader.js';

class FigCraftApp {
  constructor() {
    this.canvas = document.getElementById('design-canvas');
    this.doc = new DocumentModel();
    this.renderer = new CanvasRenderer(this.canvas);
    this.controller = new TransformController(this.renderer, this.doc);
    this.formatReader = new FormatReader(this.doc);

    this.prototypeRunner = new PrototypeRunner(
      this.doc,
      document.getElementById('presentation-modal'),
      document.getElementById('presentation-viewport')
    );

    this.activeDevLang = 'css';
    this.collapsedNodeIds = new Set();

    this.bindDOMEvents();
    this.bindKeyboardShortcuts();
    this.initCommandPalette();
    this.initTokensModal();
    this.startRenderLoop();

    // Load authentic Storytold ridgeline-app sample
    this.loadOfficialSample('ridgeline-app');
  }

  async loadOfficialSample(sampleKey) {
    try {
      this.showToast(`Loading ${sampleKey}.figcraft...`);
      await this.formatReader.loadSample(sampleKey);

      const titleInput = document.getElementById('project-title');
      if (titleInput) titleInput.value = `${sampleKey}.figcraft`;

      const sampleSelect = document.getElementById('sample-file-select');
      if (sampleSelect && sampleSelect.value !== sampleKey) {
        sampleSelect.value = sampleKey;
      }

      this.controller.doc = this.doc;
      this.prototypeRunner.doc = this.doc;

      // Select the first primary frame
      const firstFrame =
        this.doc.root.children.find((c) => c.type === 'FRAME' || c.type === 'COMPONENT') ||
        this.doc.root.children[0];
      if (firstFrame) {
        this.controller.setSelection([firstFrame]);
      }

      // Collapse Component sections by default so mobile screens are front and center in the tree
      this.collapsedNodeIds = new Set(['349']);

      setTimeout(() => {
        this.renderer.zoomToFit(this.doc, true);
        const zoomText = document.getElementById('zoom-text');
        if (zoomText) zoomText.innerText = `${Math.round(this.renderer.zoom * 100)}%`;
      }, 60);

      this.updateLayersPanel();
      this.updatePropertyInspector();
      this.showToast(`✓ Loaded ${sampleKey}.figcraft (${this.countNodes(this.doc.root)} nodes)`);
    } catch (err) {
      console.warn('Fallback to local default document:', err);
      this.initDefaultDocument();
    }
  }

  countNodes(node) {
    let count = 1;
    if (node.children) {
      for (const c of node.children) count += this.countNodes(c);
    }
    return count;
  }

  showToast(message) {
    const toast = document.getElementById('toast-notify');
    if (!toast) return;
    toast.innerText = message;
    toast.classList.add('visible');
    setTimeout(() => toast.classList.remove('visible'), 2400);
  }

  initDefaultDocument() {
    this.doc.title = 'ridgeline-app.figcraft';

    // =========================================================================
    // 1. FRAME 1: Ridgeline — Home (Light Mode) [Shot-1-Hero]
    // =========================================================================
    const frame1 = new FrameNode('Ridgeline — Home (Light)', 393, 852);
    frame1.x = 80;
    frame1.y = 80;
    frame1.fill = '#f8fafc'; // Clean light theme background

    // Status bar
    const statusBar1 = new TextNode('9:41', 'Status Bar Time');
    statusBar1.x = 32;
    statusBar1.y = 18;
    statusBar1.fontSize = 14;
    statusBar1.fontWeight = '700';
    statusBar1.fill = '#0f172a';
    frame1.addChild(statusBar1);

    // Header Greeting
    const greeting = new TextNode('Good morning, Alex ⛰️', 'Greeting');
    greeting.x = 24;
    greeting.y = 56;
    greeting.fontSize = 13;
    greeting.fontWeight = '600';
    greeting.fill = '#64748b';
    frame1.addChild(greeting);

    const exploreTitle = new TextNode('Find Your Trail', 'Header Title');
    exploreTitle.x = 24;
    exploreTitle.y = 78;
    exploreTitle.fontSize = 24;
    exploreTitle.fontWeight = '900';
    exploreTitle.fill = '#0f172a';
    frame1.addChild(exploreTitle);

    // Search Box
    const searchBg = new RectangleNode('Search Field', 345, 46);
    searchBg.x = 24;
    searchBg.y = 120;
    searchBg.cornerRadius = 14;
    searchBg.fill = '#ffffff';
    searchBg.stroke = '#e2e8f0';
    frame1.addChild(searchBg);

    const searchPlaceholder = new TextNode('🔍  Search trails, peaks, routes...', 'Search Placeholder');
    searchPlaceholder.x = 42;
    searchPlaceholder.y = 134;
    searchPlaceholder.fontSize = 13;
    searchPlaceholder.fontWeight = '500';
    searchPlaceholder.fill = '#94a3b8';
    frame1.addChild(searchPlaceholder);

    // Filter Chips (Auto Layout Row)
    const chipNames = ['🔥 Popular', '🌲 Forest', '🏔️ Ridge', '⚡ Moderate'];
    chipNames.forEach((name, i) => {
      const chip = new RectangleNode(`Chip: ${name}`, 78, 34);
      chip.x = 24 + i * 86;
      chip.y = 180;
      chip.cornerRadius = 10;
      chip.fill = i === 0 ? '#0d99ff' : '#ffffff';
      chip.stroke = i === 0 ? null : '#e2e8f0';
      frame1.addChild(chip);

      const chipLabel = new TextNode(name, `Label: ${name}`);
      chipLabel.x = 24 + i * 86 + 10;
      chipLabel.y = 190;
      chipLabel.fontSize = 11;
      chipLabel.fontWeight = '600';
      chipLabel.fill = i === 0 ? '#ffffff' : '#475569';
      frame1.addChild(chipLabel);
    });

    // FEATURED TRAIL CARD (Connects to Screen 2 in Prototype Mode!)
    const featuredCard = new RectangleNode('Featured Trail Card', 345, 230);
    featuredCard.x = 24;
    featuredCard.y = 230;
    featuredCard.cornerRadius = 20;
    featuredCard.fill = '#ffffff';
    featuredCard.stroke = '#e2e8f0';
    featuredCard.effects = [{ type: 'drop-shadow', x: 0, y: 8, blur: 20, color: 'rgba(15, 23, 42, 0.08)' }];
    frame1.addChild(featuredCard);

    // Mountain Illustration Header
    const cardArt = new RectangleNode('Mountain Landscape Art', 345, 130);
    cardArt.x = 24;
    cardArt.y = 230;
    cardArt.cornerRadius = 20;
    cardArt.fill = '#0284c7'; // Mountain blue
    frame1.addChild(cardArt);

    const difficultyPill = new RectangleNode('Difficulty Pill: Moderate', 80, 24);
    difficultyPill.x = 40;
    difficultyPill.y = 244;
    difficultyPill.cornerRadius = 12;
    difficultyPill.fill = '#ecfdf5';
    difficultyPill.stroke = '#a7f3d0';
    frame1.addChild(difficultyPill);

    const diffText = new TextNode('MODERATE', 'Pill Text');
    diffText.x = 48;
    diffText.y = 250;
    diffText.fontSize = 9;
    diffText.fontWeight = '800';
    diffText.fill = '#059669';
    frame1.addChild(diffText);

    const cardTitle = new TextNode('Cascade Canyon Trail', 'Trail Name');
    cardTitle.x = 40;
    cardTitle.y = 372;
    cardTitle.fontSize = 17;
    cardTitle.fontWeight = '800';
    cardTitle.fill = '#0f172a';
    frame1.addChild(cardTitle);

    const cardStats = new TextNode('📍 Grand Teton National Park • 8.4 mi • 1,420 ft', 'Stats Line');
    cardStats.x = 40;
    cardStats.y = 398;
    cardStats.fontSize = 11;
    cardStats.fontWeight = '500';
    cardStats.fill = '#64748b';
    frame1.addChild(cardStats);

    // Nearby Trails List
    const nearbyTitle = new TextNode('Nearby Trails', 'Nearby Title');
    nearbyTitle.x = 24;
    nearbyTitle.y = 480;
    nearbyTitle.fontSize = 16;
    nearbyTitle.fontWeight = '800';
    nearbyTitle.fill = '#0f172a';
    frame1.addChild(nearbyTitle);

    // Trail Row 1
    const row1 = new RectangleNode('Trail Row: Emerald Lake', 345, 72);
    row1.x = 24;
    row1.y = 512;
    row1.cornerRadius = 14;
    row1.fill = '#ffffff';
    row1.stroke = '#e2e8f0';
    frame1.addChild(row1);

    const row1Title = new TextNode('Emerald Lake Trail', 'Row 1 Title');
    row1Title.x = 88;
    row1Title.y = 528;
    row1Title.fontSize = 14;
    row1Title.fontWeight = '700';
    row1Title.fill = '#0f172a';
    frame1.addChild(row1Title);

    const row1Sub = new TextNode('4.2 mi • 2h 15m • Rocky Mountain', 'Row 1 Sub');
    row1Sub.x = 88;
    row1Sub.y = 550;
    row1Sub.fontSize = 11;
    row1Sub.fontWeight = '500';
    row1Sub.fill = '#64748b';
    frame1.addChild(row1Sub);

    // Trail Row 2
    const row2 = new RectangleNode('Trail Row: High Sierra Ridge', 345, 72);
    row2.x = 24;
    row2.y = 594;
    row2.cornerRadius = 14;
    row2.fill = '#ffffff';
    row2.stroke = '#e2e8f0';
    frame1.addChild(row2);

    const row2Title = new TextNode('High Sierra Granite Peak', 'Row 2 Title');
    row2Title.x = 88;
    row2Title.y = 610;
    row2Title.fontSize = 14;
    row2Title.fontWeight = '700';
    row2Title.fill = '#0f172a';
    frame1.addChild(row2Title);

    const row2Sub = new TextNode('12.8 mi • 5h 30m • Difficult', 'Row 2 Sub');
    row2Sub.x = 88;
    row2Sub.y = 632;
    row2Sub.fontSize = 11;
    row2Sub.fontWeight = '500';
    row2Sub.fill = '#64748b';
    frame1.addChild(row2Sub);

    // Bottom Translucent Tab Bar
    const tabBar1 = new RectangleNode('Frosted Tab Bar', 345, 60);
    tabBar1.x = 24;
    tabBar1.y = 770;
    tabBar1.cornerRadius = 20;
    tabBar1.fill = 'rgba(255, 255, 255, 0.9)';
    tabBar1.stroke = '#e2e8f0';
    tabBar1.effects = [{ type: 'drop-shadow', x: 0, y: 4, blur: 16, color: 'rgba(0,0,0,0.06)' }];
    frame1.addChild(tabBar1);

    const tabIcons1 = new TextNode('🏠 Home        🔍 Explore        ♡ Saved        👤 Profile', 'Tab Icons');
    tabIcons1.x = 52;
    tabIcons1.y = 792;
    tabIcons1.fontSize = 12;
    tabIcons1.fontWeight = '600';
    tabIcons1.fill = '#0f172a';
    frame1.addChild(tabIcons1);

    // =========================================================================
    // 2. FRAME 2: Ridgeline — Trail Detail Page [Shot-1 & Shot-3 Prototype]
    // =========================================================================
    const frame2 = new FrameNode('Ridgeline — Trail Detail', 393, 852);
    frame2.x = 515;
    frame2.y = 80;
    frame2.fill = '#09090b'; // Night sky mountain backdrop

    // Hero Sunset Mountain Illustration
    const heroDusk = new RectangleNode('Dusk Mountain Hero Art', 393, 380);
    heroDusk.x = 0;
    heroDusk.y = 0;
    heroDusk.fill = '#1e1b4b'; // Deep dusk purple
    frame2.addChild(heroDusk);

    // Glass Back Button (Links back to Frame 1 in Prototype!)
    const backCircle = new EllipseNode('Back Button', 42);
    backCircle.x = 24;
    backCircle.y = 48;
    backCircle.fill = 'rgba(24, 24, 27, 0.6)';
    backCircle.stroke = 'rgba(255, 255, 255, 0.2)';
    frame2.addChild(backCircle);

    const backArrow = new TextNode('←', 'Back Icon');
    backArrow.x = 38;
    backArrow.y = 58;
    backArrow.fontSize = 18;
    backArrow.fontWeight = '700';
    backArrow.fill = '#ffffff';
    frame2.addChild(backArrow);

    // Bookmark Button
    const bookmarkCircle = new EllipseNode('Bookmark Button', 42);
    bookmarkCircle.x = 327;
    bookmarkCircle.y = 48;
    bookmarkCircle.fill = 'rgba(24, 24, 27, 0.6)';
    bookmarkCircle.stroke = 'rgba(255, 255, 255, 0.2)';
    frame2.addChild(bookmarkCircle);

    const bookmarkHeart = new TextNode('♡', 'Heart Icon');
    bookmarkHeart.x = 341;
    bookmarkHeart.y = 58;
    bookmarkHeart.fontSize = 18;
    bookmarkHeart.fontWeight = '700';
    bookmarkHeart.fill = '#ffffff';
    frame2.addChild(bookmarkHeart);

    // Floating Bottom Sheet with Elevation & Stats
    const detailSheet = new RectangleNode('Floating Detail Sheet', 393, 510);
    detailSheet.x = 0;
    detailSheet.y = 342;
    detailSheet.cornerRadius = 32;
    detailSheet.fill = '#18181b';
    detailSheet.stroke = '#27272a';
    frame2.addChild(detailSheet);

    const dragPill = new RectangleNode('Sheet Handle', 40, 4);
    dragPill.x = 176;
    dragPill.y = 354;
    dragPill.cornerRadius = 2;
    dragPill.fill = '#52525b';
    frame2.addChild(dragPill);

    const detailPill = new RectangleNode('Difficulty Pill: Hard', 88, 24);
    detailPill.x = 24;
    detailPill.y = 376;
    detailPill.cornerRadius = 12;
    detailPill.fill = 'rgba(239, 68, 68, 0.15)';
    detailPill.stroke = '#ef4444';
    frame2.addChild(detailPill);

    const detailPillText = new TextNode('DIFFICULT', 'Diff Tag');
    detailPillText.x = 36;
    detailPillText.y = 382;
    detailPillText.fontSize = 9;
    detailPillText.fontWeight = '800';
    detailPillText.fill = '#ef4444';
    frame2.addChild(detailPillText);

    const detailTitle = new TextNode('High Sierra Ridge Peak', 'Detail Title');
    detailTitle.x = 24;
    detailTitle.y = 412;
    detailTitle.fontSize = 22;
    detailTitle.fontWeight = '900';
    detailTitle.fill = '#f4f4f5';
    frame2.addChild(detailTitle);

    const detailLocation = new TextNode('Inyo National Forest, California', 'Location');
    detailLocation.x = 24;
    detailLocation.y = 442;
    detailLocation.fontSize = 12;
    detailLocation.fontWeight = '500';
    detailLocation.fill = '#a1a1aa';
    frame2.addChild(detailLocation);

    // Stats Grid 3 Columns
    const statBoxes = [
      { val: '12.8 mi', lbl: 'Distance' },
      { val: '3,240 ft', lbl: 'Elevation' },
      { val: '5h 30m', lbl: 'Duration' },
    ];
    statBoxes.forEach((s, idx) => {
      const box = new RectangleNode(`Stat: ${s.lbl}`, 108, 64);
      box.x = 24 + idx * 118;
      box.y = 472;
      box.cornerRadius = 14;
      box.fill = '#27272a';
      frame2.addChild(box);

      const val = new TextNode(s.val, `Val ${idx}`);
      val.x = 36 + idx * 118;
      val.y = 484;
      val.fontSize = 15;
      val.fontWeight = '800';
      val.fill = '#38bdf8';
      frame2.addChild(val);

      const lbl = new TextNode(s.lbl, `Lbl ${idx}`);
      lbl.x = 36 + idx * 118;
      lbl.y = 510;
      lbl.fontSize = 11;
      lbl.fontWeight = '500';
      lbl.fill = '#a1a1aa';
      frame2.addChild(lbl);
    });

    // Elevation Profile Chart Card
    const chartCard = new RectangleNode('Elevation Profile Chart', 345, 120);
    chartCard.x = 24;
    chartCard.y = 552;
    chartCard.cornerRadius = 16;
    chartCard.fill = '#27272a';
    frame2.addChild(chartCard);

    const chartTitle = new TextNode('Elevation Profile (8,200 ft → 11,440 ft)', 'Chart Title');
    chartTitle.x = 40;
    chartTitle.y = 568;
    chartTitle.fontSize = 11;
    chartTitle.fontWeight = '700';
    chartTitle.fill = '#38bdf8';
    frame2.addChild(chartTitle);

    // Primary CTA Button (Links to Frame 3 in Prototype!)
    const startHikeBtn = new RectangleNode('Start Hike Button', 345, 54);
    startHikeBtn.x = 24;
    startHikeBtn.y = 760;
    startHikeBtn.cornerRadius = 16;
    startHikeBtn.fill = '#0d99ff'; // Brand Primary
    startHikeBtn.effects = [{ type: 'drop-shadow', x: 0, y: 8, blur: 24, color: 'rgba(13, 153, 255, 0.4)' }];
    frame2.addChild(startHikeBtn);

    const startHikeText = new TextNode('Start Hike Now 🥾', 'CTA Label');
    startHikeText.x = 125;
    startHikeText.y = 778;
    startHikeText.fontSize = 15;
    startHikeText.fontWeight = '800';
    startHikeText.fill = '#ffffff';
    frame2.addChild(startHikeText);

    // =========================================================================
    // 3. FRAME 3: Ridgeline — Home (Dark Mode) [Shot-1 Color Variable Mode]
    // =========================================================================
    // =========================================================================
    // 3. FRAME 3: Ridgeline — Live Route GPS Navigation (OLED Dark Mode)
    // =========================================================================
    const frame3 = new FrameNode('Ridgeline — Live Route & GPS', 393, 852);
    frame3.x = 950;
    frame3.y = 80;
    frame3.fill = '#09090b';

    // Dark Status bar
    const statusBar3 = new TextNode('9:41', 'Status Bar Time Dark');
    statusBar3.x = 32;
    statusBar3.y = 18;
    statusBar3.fontSize = 14;
    statusBar3.fontWeight = '700';
    statusBar3.fill = '#f4f4f5';
    frame3.addChild(statusBar3);

    // Header with Back Button and Compass
    const backCircle3 = new EllipseNode('Back Button GPS', 38);
    backCircle3.x = 24;
    backCircle3.y = 48;
    backCircle3.fill = '#18181b';
    backCircle3.stroke = '#27272a';
    frame3.addChild(backCircle3);

    const backArrow3 = new TextNode('←', 'Back Icon GPS');
    backArrow3.x = 36;
    backArrow3.y = 56;
    backArrow3.fontSize = 16;
    backArrow3.fontWeight = '700';
    backArrow3.fill = '#f4f4f5';
    frame3.addChild(backArrow3);

    const headerNavTitle = new TextNode('Mt. Whitney Ascent', 'Nav Title');
    headerNavTitle.x = 74;
    headerNavTitle.y = 52;
    headerNavTitle.fontSize = 16;
    headerNavTitle.fontWeight = '800';
    headerNavTitle.fill = '#f4f4f5';
    frame3.addChild(headerNavTitle);

    const compassPill = new RectangleNode('Compass Pill', 86, 28);
    compassPill.x = 283;
    compassPill.y = 52;
    compassPill.cornerRadius = 14;
    compassPill.fill = '#18181b';
    compassPill.stroke = '#38bdf8';
    frame3.addChild(compassPill);

    const compassText = new TextNode('🧭 342° NW', 'Compass Text');
    compassText.x = 293;
    compassText.y = 59;
    compassText.fontSize = 11;
    compassText.fontWeight = '700';
    compassText.fill = '#38bdf8';
    frame3.addChild(compassText);

    // Live GPS Topo Map Card (renders drawGpsTopoMap)
    const gpsMapCard = new RectangleNode('Night Mountain Art GPS Map', 345, 450);
    gpsMapCard.x = 24;
    gpsMapCard.y = 96;
    gpsMapCard.cornerRadius = 24;
    gpsMapCard.fill = '#09090b';
    gpsMapCard.stroke = '#27272a';
    frame3.addChild(gpsMapCard);

    // Floating HUD Turn-by-Turn Guidance Pill
    const turnCard = new RectangleNode('Turn Guidance HUD', 315, 64);
    turnCard.x = 39;
    turnCard.y = 112;
    turnCard.cornerRadius = 16;
    turnCard.fill = 'rgba(24, 24, 27, 0.92)';
    turnCard.stroke = 'rgba(56, 189, 248, 0.3)';
    turnCard.effects = [{ type: 'drop-shadow', x: 0, y: 8, blur: 20, color: 'rgba(0, 0, 0, 0.5)' }];
    frame3.addChild(turnCard);

    const turnIcon = new TextNode('↰', 'Turn Arrow');
    turnIcon.x = 55;
    turnIcon.y = 126;
    turnIcon.fontSize = 24;
    turnIcon.fontWeight = '900';
    turnIcon.fill = '#38bdf8';
    frame3.addChild(turnIcon);

    const turnText = new TextNode('In 350 ft, turn left onto Granite Pass', 'Turn Direction');
    turnText.x = 88;
    turnText.y = 124;
    turnText.fontSize = 12;
    turnText.fontWeight = '700';
    turnText.fill = '#f4f4f5';
    frame3.addChild(turnText);

    const turnSub = new TextNode('Stay on blue trail markers • Next landmark: Trail Crest', 'Turn Sub');
    turnSub.x = 88;
    turnSub.y = 144;
    turnSub.fontSize = 10;
    turnSub.fontWeight = '500';
    turnSub.fill = '#a1a1aa';
    frame3.addChild(turnSub);

    // Floating Live Metrics Dock
    const metricsDock = new RectangleNode('Metrics Dock', 345, 120);
    metricsDock.x = 24;
    metricsDock.y = 566;
    metricsDock.cornerRadius = 20;
    metricsDock.fill = '#18181b';
    metricsDock.stroke = '#27272a';
    frame3.addChild(metricsDock);

    const navStats = [
      { val: '4.2 mi', lbl: 'Remaining', color: '#38bdf8' },
      { val: '11,280 ft', lbl: 'Altitude', color: '#22c55e' },
      { val: '3.4 mph', lbl: 'Avg Speed', color: '#f59e0b' },
      { val: '4:45 PM', lbl: 'Est Arrival', color: '#c084fc' },
    ];
    navStats.forEach((s, idx) => {
      const sx = 36 + idx * 82;
      const val = new TextNode(s.val, `StatVal_${idx}`);
      val.x = sx;
      val.y = 586;
      val.fontSize = 14;
      val.fontWeight = '800';
      val.fill = s.color;
      frame3.addChild(val);

      const lbl = new TextNode(s.lbl, `StatLbl_${idx}`);
      lbl.x = sx;
      lbl.y = 612;
      lbl.fontSize = 10;
      lbl.fontWeight = '500';
      lbl.fill = '#a1a1aa';
      frame3.addChild(lbl);
    });

    // End Hike / SOS Button Bar
    const endHikeBtn = new RectangleNode('End Hike Button', 260, 50);
    endHikeBtn.x = 24;
    endHikeBtn.y = 704;
    endHikeBtn.cornerRadius = 14;
    endHikeBtn.fill = '#ef4444';
    frame3.addChild(endHikeBtn);

    const endHikeLabel = new TextNode('Finish & Save Activity 🏁', 'End Hike Text');
    endHikeLabel.x = 75;
    endHikeLabel.y = 720;
    endHikeLabel.fontSize = 13;
    endHikeLabel.fontWeight = '800';
    endHikeLabel.fill = '#ffffff';
    frame3.addChild(endHikeLabel);

    const sosBtn = new RectangleNode('SOS Emergency Button', 75, 50);
    sosBtn.x = 294;
    sosBtn.y = 704;
    sosBtn.cornerRadius = 14;
    sosBtn.fill = '#27272a';
    sosBtn.stroke = '#ef4444';
    frame3.addChild(sosBtn);

    const sosLabel = new TextNode('🆘 SOS', 'SOS Text');
    sosLabel.x = 310;
    sosLabel.y = 720;
    sosLabel.fontSize = 12;
    sosLabel.fontWeight = '800';
    sosLabel.fill = '#ef4444';
    frame3.addChild(sosLabel);

    // =========================================================================
    // 4. FRAME 4: Button Component Set (3x3 Variant Grid) [Shot-2 Components]
    // =========================================================================
    const frameComp = new FrameNode('❖ Component Set: Button (9 Variants)', 760, 380);
    frameComp.x = 80;
    frameComp.y = 980;
    frameComp.fill = '#18181b';
    frameComp.stroke = '#a855f7'; // Signature Master Component Purple
    frameComp.strokeWidth = 2;

    const compHeader = new TextNode('❖ Button Component Set — Auto Layout 3x3 Variant Matrix', 'Comp Set Header');
    compHeader.x = 24;
    compHeader.y = 20;
    compHeader.fontSize = 14;
    compHeader.fontWeight = '800';
    compHeader.fill = '#c084fc';
    frameComp.addChild(compHeader);

    const styles = ['Primary', 'Tonal', 'Outline'];
    const states = ['Default', 'Hover', 'Disabled'];

    styles.forEach((style, r) => {
      states.forEach((state, c) => {
        const btn = new RectangleNode(`Btn_${style}_${state}`, 210, 48);
        btn.x = 24 + c * 240;
        btn.y = 60 + r * 100;
        btn.cornerRadius = 10;

        if (style === 'Primary') {
          btn.fill = state === 'Default' ? '#0d99ff' : state === 'Hover' ? '#0284c7' : '#3f3f46';
        } else if (style === 'Tonal') {
          btn.fill = state === 'Default' ? '#1e293b' : state === 'Hover' ? '#334155' : '#18181b';
        } else {
          btn.fill = 'transparent';
          btn.stroke = state === 'Default' ? '#0d99ff' : state === 'Hover' ? '#38bdf8' : '#27272a';
        }
        frameComp.addChild(btn);

        const label = new TextNode(`Button (${style})`, `Label_${style}_${state}`);
        label.x = 24 + c * 240 + 50;
        label.y = 60 + r * 100 + 16;
        label.fontSize = 12;
        label.fontWeight = '700';
        label.fill = state === 'Disabled' ? '#71717a' : '#ffffff';
        frameComp.addChild(label);

        // Property Tag underneath
        const propTag = new TextNode(`Style=${style}, State=${state}`, `PropTag_${r}_${c}`);
        propTag.x = 24 + c * 240 + 20;
        propTag.y = 60 + r * 100 + 58;
        propTag.fontSize = 10;
        propTag.fontWeight = '600';
        propTag.fill = '#a855f7';
        frameComp.addChild(propTag);
      });
    });

    // =========================================================================
    // 5. PROTOTYPE CONNECTIONS (Smooth Blue Cubic Bezier Curves - Shot-3)
    // =========================================================================
    featuredCard.prototypeLink = {
      targetFrameId: frame2.id,
      trigger: 'On click',
      transition: 'Smart animate (300ms)',
    };
    backCircle.prototypeLink = {
      targetFrameId: frame1.id,
      trigger: 'On click',
      transition: 'Slide right (250ms)',
    };
    startHikeBtn.prototypeLink = {
      targetFrameId: frame3.id,
      trigger: 'On click',
      transition: 'Push left (300ms)',
    };
    backCircle3.prototypeLink = {
      targetFrameId: frame2.id,
      trigger: 'On click',
      transition: 'Slide right (250ms)',
    };
    endHikeBtn.prototypeLink = {
      targetFrameId: frame1.id,
      trigger: 'On click',
      transition: 'Fade to Home (300ms)',
    };

    // Add all 4 frames to document
    this.doc.addNode(frame1);
    this.doc.addNode(frame2);
    this.doc.addNode(frame3);
    this.doc.addNode(frameComp);

    this.controller.setSelection([frame1]);

    // Automatically zoom to fit all artboards neatly in viewport
    this.renderer.zoomToFit(this.doc);
    const zoomText = document.getElementById('zoom-text');
    if (zoomText) zoomText.innerText = `${Math.round(this.renderer.zoom * 100)}%`;
  }

  bindDOMEvents() {
    const canvas = this.canvas;

    // Canvas Mouse Interactions
    canvas.addEventListener('mousedown', (e) => this.controller.handleMouseDown(e));
    window.addEventListener('mousemove', (e) => this.controller.handleMouseMove(e));
    window.addEventListener('mouseup', (e) => this.controller.handleMouseUp(e));

    // Mouse Wheel Zoom & Pan
    canvas.addEventListener(
      'wheel',
      (e) => {
        e.preventDefault();
        if (e.ctrlKey || e.metaKey) {
          const zoomDelta = e.deltaY < 0 ? 1.12 : 0.89;
          const newZoom = Math.min(20, Math.max(0.1, this.renderer.zoom * zoomDelta));

          const mouse = this.renderer.screenToWorld(e.clientX, e.clientY);
          this.renderer.zoom = newZoom;
          this.renderer.panX = e.clientX - mouse.x * newZoom;
          this.renderer.panY = e.clientY - mouse.y * newZoom;
          document.getElementById('zoom-text').innerText = `${Math.round(newZoom * 100)}%`;
        } else {
          this.renderer.panX -= e.deltaX;
          this.renderer.panY -= e.deltaY;
        }
      },
      { passive: false }
    );

    // Mode Switch Tabs (Design / Prototype / Dev Mode)
    document.querySelectorAll('.mode-tab').forEach((tab) => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.mode-tab').forEach((t) => t.classList.remove('active'));
        tab.classList.add('active');
        const mode = tab.dataset.mode;
        this.renderer.mode = mode;

        const protoBanner = document.getElementById('proto-banner');
        if (mode === 'prototype') {
          protoBanner.classList.add('visible');
        } else {
          protoBanner.classList.remove('visible');
        }

        const devSection = document.getElementById('dev-code-section');
        const designSection = document.getElementById('design-props-section');
        if (mode === 'dev') {
          devSection.style.display = 'block';
          designSection.style.display = 'none';
          this.updateDevModeCode();
        } else {
          devSection.style.display = 'none';
          designSection.style.display = 'block';
        }
      });
    });

    // Tool Selection Buttons
    document.querySelectorAll('.tool-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const tool = btn.dataset.tool;

        // If clicking frame tool, toggle frame presets flyout
        if (tool === 'frame') {
          const flyout = document.getElementById('frame-presets-dropdown');
          flyout.classList.toggle('active');
          return;
        }

        document.getElementById('frame-presets-dropdown').classList.remove('active');
        document.querySelectorAll('.tool-btn').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');

        if (tool === 'select') {
          this.controller.creationType = null;
          this.canvas.parentElement.className = 'canvas-viewport';
        } else if (tool === 'pen') {
          this.controller.creationType = 'PEN';
          this.canvas.parentElement.className = 'canvas-viewport crosshair';
          this.showToast('Pen tool active: click to add points, click start to close');
        } else {
          this.controller.creationType = tool.toUpperCase();
          this.canvas.parentElement.className = 'canvas-viewport crosshair';
        }
      });
    });

    // Frame Presets Clicks
    document.querySelectorAll('.preset-item').forEach((item) => {
      item.addEventListener('click', () => {
        const preset = item.dataset.preset;
        this.createFrameFromPreset(preset);
        document.getElementById('frame-presets-dropdown').classList.remove('active');
      });
    });

    // Boolean Operations
    document.getElementById('btn-bool-union')?.addEventListener('click', () => this.applyBooleanOp('UNION'));
    document.getElementById('btn-bool-subtract')?.addEventListener('click', () => this.applyBooleanOp('SUBTRACT'));
    document.getElementById('btn-bool-intersect')?.addEventListener('click', () => this.applyBooleanOp('INTERSECT'));
    document.getElementById('btn-bool-exclude')?.addEventListener('click', () => this.applyBooleanOp('EXCLUDE'));

    // Component Creation
    document.getElementById('btn-create-component')?.addEventListener('click', () => {
      this.createComponentFromSelection();
    });

    // Selection Callbacks
    this.controller.onSelectionChange = () => {
      this.updateLayersPanel();
      this.updatePropertyInspector();
      if (this.renderer.mode === 'dev') this.updateDevModeCode();
    };

    this.controller.onDocumentModified = () => {
      AutoLayoutEngine.applyRecursive(this.doc.root);
      this.updatePropertyInspector();
      if (this.renderer.mode === 'dev') this.updateDevModeCode();
    };

    // Zoom Buttons
    document.getElementById('btn-zoom-in')?.addEventListener('click', () => {
      this.renderer.zoom = Math.min(20, this.renderer.zoom * 1.25);
      document.getElementById('zoom-text').innerText = `${Math.round(this.renderer.zoom * 100)}%`;
    });
    document.getElementById('btn-zoom-out')?.addEventListener('click', () => {
      this.renderer.zoom = Math.max(0.1, this.renderer.zoom * 0.8);
      document.getElementById('zoom-text').innerText = `${Math.round(this.renderer.zoom * 100)}%`;
    });
    document.getElementById('btn-zoom-reset')?.addEventListener('click', () => {
      this.renderer.zoomToFit(this.doc, true);
      document.getElementById('zoom-text').innerText = `${Math.round(this.renderer.zoom * 100)}%`;
      this.showToast('Zoomed to Fit Screens');
    });

    // 12-Column Grid Toggle (Shot-6 Dashboard)
    document.getElementById('btn-toggle-grid')?.addEventListener('click', () => {
      this.renderer.showLayoutGrid = !this.renderer.showLayoutGrid;
      const btn = document.getElementById('btn-toggle-grid');
      if (this.renderer.showLayoutGrid) {
        btn.classList.add('active');
        this.showToast('12-Column Layout Grid Active (Shot-6)');
      } else {
        btn.classList.remove('active');
        this.showToast('Layout Grid Hidden');
      }
    });

    // Left Sidebar Tab Switcher: Layers vs Assets (Shot-2 Components)
    const btnTabLayers = document.getElementById('btn-tab-layers');
    const btnTabAssets = document.getElementById('btn-tab-assets');
    const layersTree = document.getElementById('layers-tree');
    const assetsPanel = document.getElementById('assets-library-panel');

    btnTabLayers?.addEventListener('click', () => {
      btnTabLayers.classList.add('active');
      btnTabAssets?.classList.remove('active');
      layersTree.style.display = 'block';
      assetsPanel.style.display = 'none';
    });

    btnTabAssets?.addEventListener('click', () => {
      btnTabAssets.classList.add('active');
      btnTabLayers?.classList.remove('active');
      layersTree.style.display = 'none';
      assetsPanel.style.display = 'flex';
    });

    // Asset Library Cards Click to Insert
    document.querySelectorAll('.asset-card').forEach((card) => {
      card.addEventListener('click', () => {
        const compType = card.dataset.component;
        this.insertComponentInstance(compType);
      });
    });

    // Prototyping Present Button
    document.getElementById('btn-present')?.addEventListener('click', () => {
      const selectedFrame = this.controller.selectedNodes.find((n) => n.type === 'FRAME');
      this.prototypeRunner.start(selectedFrame);
    });
    document.getElementById('btn-restart-presentation')?.addEventListener('click', () => {
      this.prototypeRunner.restart();
    });
    document.getElementById('btn-close-presentation')?.addEventListener('click', () => {
      this.prototypeRunner.stop();
    });

    // Save & Load File (.figcraft)
    document.getElementById('btn-save-project')?.addEventListener('click', () => {
      const dataStr =
        'data:text/json;charset=utf-8,' +
        encodeURIComponent(JSON.stringify(this.doc.toJSON(), null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute('href', dataStr);
      downloadAnchor.setAttribute(
        'download',
        `${this.doc.title.toLowerCase().replace(/\s+/g, '_')}.figcraft`
      );
      downloadAnchor.click();
      this.showToast('Project saved as native .figcraft file');
    });

    // 1-Click Official Sample File Switcher
    const sampleSelect = document.getElementById('sample-file-select');
    sampleSelect?.addEventListener('change', (e) => {
      this.loadOfficialSample(e.target.value);
    });

    const fileInput = document.getElementById('project-file-input');
    document.getElementById('btn-open-project')?.addEventListener('click', () => fileInput.click());
    fileInput?.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (evt) => {
        try {
          const json = JSON.parse(evt.target.result);
          if (json.format === 'figcraft' || json.nodes) {
            this.formatReader.parseDocument(json, file.name);
          } else {
            this.doc = DocumentModel.fromJSON(json);
          }
          this.controller.doc = this.doc;
          this.prototypeRunner.doc = this.doc;
          this.controller.setSelection([]);
          this.renderer.zoomToFit(this.doc);
          this.updateLayersPanel();
          this.updatePropertyInspector();
          this.showToast(`Loaded ${file.name}`);
        } catch (err) {
          alert('Invalid .figcraft file format: ' + err.message);
        }
      };
      reader.readAsText(file);
    });

    // Export PNG
    document.getElementById('btn-export-png')?.addEventListener('click', () => {
      const target = this.controller.selectedNodes[0] || this.doc.root.children[0];
      if (target) {
        ExportEngine.exportNodeToPNG(target, 2);
        this.showToast(`Exported ${target.name} as Hi-DPI PNG (2x)`);
      }
    });

    // Export SVG
    document.getElementById('btn-export-svg')?.addEventListener('click', () => {
      const target = this.controller.selectedNodes[0] || this.doc.root.children[0];
      if (target) {
        ExportEngine.exportNodeToSVG(target);
        this.showToast(`Exported ${target.name} as clean SVG`);
      }
    });

    document.getElementById('btn-inspect-export-svg')?.addEventListener('click', () => {
      const target = this.controller.selectedNodes[0];
      if (target) ExportEngine.exportNodeToSVG(target);
    });
    document.getElementById('btn-inspect-export-png')?.addEventListener('click', () => {
      const target = this.controller.selectedNodes[0];
      if (target) ExportEngine.exportNodeToPNG(target, 2);
    });

    // Dev Mode Language Tabs
    document.querySelectorAll('.dev-tab-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.dev-tab-btn').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        this.activeDevLang = btn.dataset.lang;
        this.updateDevModeCode();
      });
    });

    // Copy Dev Code
    document.getElementById('btn-copy-code')?.addEventListener('click', () => {
      const code = document.getElementById('dev-code-preview').innerText;
      navigator.clipboard.writeText(code).then(() => {
        this.showToast('Code copied to clipboard!');
      });
    });

    this.bindPropertyInputs();
  }

  createFrameFromPreset(preset) {
    let name = 'New Artboard';
    let width = 393;
    let height = 852;

    switch (preset) {
      case 'iphone16':
        name = 'iPhone 16 Pro';
        width = 393;
        height = 852;
        break;
      case 'pixel9':
        name = 'Google Pixel 9';
        width = 412;
        height = 923;
        break;
      case 'macbook':
        name = 'MacBook Pro 16"';
        width = 1728;
        height = 1117;
        break;
      case 'ipad':
        name = 'iPad Pro 12.9"';
        width = 1024;
        height = 1366;
        break;
      case 'dribbble':
        name = 'Dribbble Shot';
        width = 1600;
        height = 1200;
        break;
      case 'instagram':
        name = 'Instagram Post';
        width = 1080;
        height = 1080;
        break;
    }

    const frame = new FrameNode(name, width, height);
    frame.x = Math.round(100 - this.renderer.panX / this.renderer.zoom);
    frame.y = Math.round(100 - this.renderer.panY / this.renderer.zoom);
    frame.fill = '#09090b';

    this.doc.addNode(frame);
    this.controller.setSelection([frame]);
    this.showToast(`Created ${name} (${width}×${height})`);
  }

  createComponentFromSelection() {
    const sel = this.controller.selectedNodes;
    if (sel.length === 0) return;

    const target = sel[0];
    const comp = new ComponentNode(`❖ ${target.name}`, target.width, target.height);
    comp.x = target.x;
    comp.y = target.y;
    comp.fill = target.fill;
    comp.stroke = '#a855f7';
    comp.strokeWidth = 1.5;
    comp.cornerRadius = target.cornerRadius;

    // Reparent children
    while (target.children.length > 0) {
      comp.addChild(target.children[0]);
    }

    if (target.parent) {
      target.parent.removeChild(target);
      target.parent.addChild(comp);
    } else {
      this.doc.addNode(comp);
    }

    this.controller.setSelection([comp]);
    this.showToast(`Converted '${target.name}' to Master Component`);
  }

  applyBooleanOp(operation) {
    const sel = this.controller.selectedNodes;
    if (sel.length < 2) {
      this.showToast('Select 2 or more layers for boolean operation');
      return;
    }

    const group = new BooleanNode(`Boolean ${operation}`, operation);
    let minX = Infinity,
      minY = Infinity,
      maxX = -Infinity,
      maxY = -Infinity;

    for (const node of sel) {
      const b = node.getBounds();
      minX = Math.min(minX, b.x);
      minY = Math.min(minY, b.y);
      maxX = Math.max(maxX, b.right);
      maxY = Math.max(maxY, b.bottom);
    }

    group.x = minX;
    group.y = minY;
    group.width = maxX - minX;
    group.height = maxY - minY;

    for (const node of sel) {
      node.parent?.removeChild(node);
      group.addChild(node);
    }

    this.doc.addNode(group);
    this.controller.setSelection([group]);
    this.showToast(`Applied ${operation} operation`);
  }

  bindPropertyInputs() {
    const bindNum = (id, prop) => {
      const el = document.getElementById(id);
      if (!el) return;
      el.addEventListener('input', () => {
        const node = this.controller.selectedNodes[0];
        if (node) {
          node[prop] = parseFloat(el.value) || 0;
          AutoLayoutEngine.applyRecursive(this.doc.root);
        }
      });
    };

    bindNum('prop-x', 'x');
    bindNum('prop-y', 'y');
    bindNum('prop-w', 'width');
    bindNum('prop-h', 'height');
    bindNum('prop-radius', 'cornerRadius');
    bindNum('prop-opacity', 'opacity');
    bindNum('prop-stroke-width', 'strokeWidth');
    bindNum('prop-font-size', 'fontSize');

    // Text content
    const textContentInput = document.getElementById('prop-text-content');
    if (textContentInput) {
      textContentInput.addEventListener('input', () => {
        const node = this.controller.selectedNodes[0];
        if (node && node.type === 'TEXT') {
          node.text = textContentInput.value;
        }
      });
    }

    // Font weight
    const fontWeightInput = document.getElementById('prop-font-weight');
    if (fontWeightInput) {
      fontWeightInput.addEventListener('input', () => {
        const node = this.controller.selectedNodes[0];
        if (node && node.type === 'TEXT') {
          node.fontWeight = fontWeightInput.value;
        }
      });
    }

    // Fill Color
    const fillEl = document.getElementById('prop-fill');
    const colorPicker = document.getElementById('prop-color-picker');
    if (fillEl && colorPicker) {
      colorPicker.addEventListener('input', () => {
        fillEl.value = colorPicker.value;
        const node = this.controller.selectedNodes[0];
        if (node) node.fill = colorPicker.value;
      });
      fillEl.addEventListener('input', () => {
        const node = this.controller.selectedNodes[0];
        if (node) {
          node.fill = fillEl.value;
          colorPicker.value = fillEl.value;
        }
      });
    }

    // Stroke Color
    const strokeEl = document.getElementById('prop-stroke');
    const strokePicker = document.getElementById('prop-stroke-picker');
    if (strokeEl && strokePicker) {
      strokePicker.addEventListener('input', () => {
        strokeEl.value = strokePicker.value;
        const node = this.controller.selectedNodes[0];
        if (node) node.stroke = strokePicker.value;
      });
      strokeEl.addEventListener('input', () => {
        const node = this.controller.selectedNodes[0];
        if (node) {
          node.stroke = strokeEl.value;
          strokePicker.value = strokeEl.value;
        }
      });
    }

    // Stroke Style (Solid / Dashed)
    document.getElementById('btn-stroke-solid')?.addEventListener('click', () => {
      document.getElementById('btn-stroke-solid').classList.add('active');
      document.getElementById('btn-stroke-dashed').classList.remove('active');
      const node = this.controller.selectedNodes[0];
      if (node) node.strokeStyle = 'solid';
    });
    document.getElementById('btn-stroke-dashed')?.addEventListener('click', () => {
      document.getElementById('btn-stroke-dashed').classList.add('active');
      document.getElementById('btn-stroke-solid').classList.remove('active');
      const node = this.controller.selectedNodes[0];
      if (node) node.strokeStyle = 'dashed';
    });

    // Auto Layout Toggle
    document.getElementById('toggle-auto-layout')?.addEventListener('change', (e) => {
      const node = this.controller.selectedNodes[0];
      if (node && (node.type === 'FRAME' || node.type === 'COMPONENT')) {
        node.autoLayout.enabled = e.target.checked;
        document.getElementById('auto-layout-details').style.display = e.target.checked ? 'block' : 'none';
        AutoLayoutEngine.applyRecursive(this.doc.root);
      }
    });

    // Auto Layout Direction
    document.querySelectorAll('.btn-al-dir').forEach((btn) => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.btn-al-dir').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        const node = this.controller.selectedNodes[0];
        if (node && (node.type === 'FRAME' || node.type === 'COMPONENT')) {
          node.autoLayout.direction = btn.dataset.dir;
          AutoLayoutEngine.applyRecursive(this.doc.root);
        }
      });
    });

    // Auto Layout Gap & Padding
    document.getElementById('prop-al-gap')?.addEventListener('input', (e) => {
      const node = this.controller.selectedNodes[0];
      if (node && node.autoLayout) {
        node.autoLayout.gap = parseFloat(e.target.value) || 0;
        AutoLayoutEngine.applyRecursive(this.doc.root);
      }
    });
    document.getElementById('prop-al-padding')?.addEventListener('input', (e) => {
      const node = this.controller.selectedNodes[0];
      if (node && node.autoLayout) {
        const pad = parseFloat(e.target.value) || 0;
        node.autoLayout.paddingTop = pad;
        node.autoLayout.paddingRight = pad;
        node.autoLayout.paddingBottom = pad;
        node.autoLayout.paddingLeft = pad;
        AutoLayoutEngine.applyRecursive(this.doc.root);
      }
    });
  }

  bindKeyboardShortcuts() {
    window.addEventListener('keydown', (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

      // Alt key for redline distance guides
      if (e.altKey) {
        this.renderer.altKeyDown = true;
      }

      // Spacebar for Hand Pan
      if (e.code === 'Space' && !e.repeat) {
        this.canvas.parentElement.className = 'canvas-viewport panning';
      }

      // Command Palette (Ctrl+K / Cmd+K)
      if ((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        this.toggleCommandPalette();
      }

      // Create Component (Ctrl+Alt+K)
      if ((e.ctrlKey || e.metaKey) && e.altKey && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        this.createComponentFromSelection();
      }

      // Pen Tool finish on Enter
      if (e.key === 'Enter' && this.controller.creationType === 'PEN') {
        this.controller.finishPenDrawing(false);
        this.selectTool('select');
      }

      // Tool shortcuts
      if (e.key === 'v' || e.key === 'V') this.selectTool('select');
      if (e.key === 'f' || e.key === 'F') {
        document.getElementById('frame-presets-dropdown').classList.toggle('active');
      }
      if (e.key === 'r' || e.key === 'R') this.selectTool('rectangle');
      if (e.key === 'o' || e.key === 'O') this.selectTool('ellipse');
      if (e.key === 't' || e.key === 'T') this.selectTool('text');
      if (e.key === 'p' || e.key === 'P') this.selectTool('pen');

      // Duplicate (Ctrl+D / Cmd+D)
      if ((e.ctrlKey || e.metaKey) && (e.key === 'd' || e.key === 'D')) {
        e.preventDefault();
        const clones = [];
        for (const node of this.controller.selectedNodes) {
          if (node.type === 'COMPONENT') {
            // Instantiate an InstanceNode linking to master component
            const instance = new InstanceNode(node);
            instance.x = node.x + 40;
            instance.y = node.y + 40;
            node.parent ? node.parent.addChild(instance) : this.doc.addNode(instance);
            clones.push(instance);
          } else if (node.parent) {
            const clone = node.clone();
            node.parent.addChild(clone);
            clones.push(clone);
          }
        }
        if (clones.length > 0) {
          this.controller.setSelection(clones);
          this.showToast('Duplicated selection');
        }
      }

      // Delete (Backspace / Delete)
      if (e.key === 'Delete' || e.key === 'Backspace') {
        for (const node of this.controller.selectedNodes) {
          this.doc.deleteNode(node);
        }
        this.controller.setSelection([]);
      }
    });

    window.addEventListener('keyup', (e) => {
      if (e.code === 'Space') {
        this.canvas.parentElement.className = 'canvas-viewport';
      }
      if (!e.altKey) {
        this.renderer.altKeyDown = false;
      }
    });
  }

  selectTool(toolName) {
    document.querySelectorAll('.tool-btn').forEach((b) => {
      b.classList.toggle('active', b.dataset.tool === toolName);
    });
    if (toolName === 'select') {
      this.controller.creationType = null;
      this.canvas.parentElement.className = 'canvas-viewport';
    } else if (toolName === 'pen') {
      this.controller.creationType = 'PEN';
      this.canvas.parentElement.className = 'canvas-viewport crosshair';
      this.showToast('Pen tool active: click canvas to place vertices');
    } else {
      this.controller.creationType = toolName.toUpperCase();
      this.canvas.parentElement.className = 'canvas-viewport crosshair';
    }
  }

  // --- Command Palette Engine ---
  initCommandPalette() {
    const backdrop = document.getElementById('cmd-palette-backdrop');
    const input = document.getElementById('cmd-input');
    const results = document.getElementById('cmd-results');

    const commands = [
      { name: 'Create Frame: iPhone 16 Pro', shortcut: 'F', action: () => this.createFrameFromPreset('iphone16') },
      { name: 'Create Frame: Google Pixel 9', shortcut: '', action: () => this.createFrameFromPreset('pixel9') },
      { name: 'Create Frame: MacBook Pro 16"', shortcut: '', action: () => this.createFrameFromPreset('macbook') },
      { name: 'Create Rectangle', shortcut: 'R', action: () => this.selectTool('rectangle') },
      { name: 'Create Ellipse / Circle', shortcut: 'O', action: () => this.selectTool('ellipse') },
      { name: 'Create Text Layer', shortcut: 'T', action: () => this.selectTool('text') },
      { name: 'Vector Pen Tool', shortcut: 'P', action: () => this.selectTool('pen') },
      { name: 'Create Master Component', shortcut: 'Ctrl+Alt+K', action: () => this.createComponentFromSelection() },
      { name: 'Boolean Union', shortcut: '', action: () => this.applyBooleanOp('UNION') },
      { name: 'Boolean Subtract', shortcut: '', action: () => this.applyBooleanOp('SUBTRACT') },
      { name: 'Run Interactive Prototype', shortcut: 'Present', action: () => document.getElementById('btn-present')?.click() },
      { name: 'Toggle Dev Mode', shortcut: '', action: () => document.getElementById('tab-dev')?.click() },
      { name: 'Export Clean SVG Vector', shortcut: '', action: () => document.getElementById('btn-export-svg')?.click() },
      { name: 'Export Hi-DPI PNG (2x)', shortcut: '', action: () => document.getElementById('btn-export-png')?.click() },
      { name: 'Save Project (.figcraft)', shortcut: 'Ctrl+S', action: () => document.getElementById('btn-save-project')?.click() },
      { name: 'Open Project File', shortcut: 'Ctrl+O', action: () => document.getElementById('btn-open-project')?.click() },
      { name: 'Design Tokens & Variables', shortcut: '', action: () => document.getElementById('btn-tokens-modal')?.click() },
      { name: 'Reset Zoom (100%)', shortcut: 'Shift+0', action: () => document.getElementById('btn-zoom-reset')?.click() },
    ];

    const renderResults = (query = '') => {
      results.innerHTML = '';
      const filtered = commands.filter((c) => c.name.toLowerCase().includes(query.toLowerCase()));
      filtered.forEach((cmd, idx) => {
        const item = document.createElement('div');
        item.className = `cmd-item ${idx === 0 ? 'active' : ''}`;
        item.innerHTML = `
          <span>${cmd.name}</span>
          ${cmd.shortcut ? `<span class="cmd-shortcut">${cmd.shortcut}</span>` : ''}
        `;
        item.addEventListener('click', () => {
          cmd.action();
          this.closeCommandPalette();
        });
        results.appendChild(item);
      });
    };

    input?.addEventListener('input', () => renderResults(input.value));

    input?.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.closeCommandPalette();
      } else if (e.key === 'Enter') {
        const active = results.querySelector('.cmd-item.active') || results.querySelector('.cmd-item');
        if (active) {
          active.click();
        }
      }
    });

    backdrop?.addEventListener('click', (e) => {
      if (e.target === backdrop) this.closeCommandPalette();
    });

    document.getElementById('btn-cmd-palette')?.addEventListener('click', () => {
      this.toggleCommandPalette();
    });
  }

  toggleCommandPalette() {
    const backdrop = document.getElementById('cmd-palette-backdrop');
    const input = document.getElementById('cmd-input');
    backdrop.classList.toggle('active');
    if (backdrop.classList.contains('active')) {
      input.value = '';
      input.focus();
      const event = new Event('input');
      input.dispatchEvent(event);
    }
  }

  closeCommandPalette() {
    document.getElementById('cmd-palette-backdrop').classList.remove('active');
  }

  // --- Design Tokens & Variables Modal ---
  initTokensModal() {
    const backdrop = document.getElementById('tokens-modal-backdrop');
    const container = document.getElementById('tokens-list-container');

    const renderTokens = () => {
      container.innerHTML = '';
      const mode = this.doc.variables.activeMode;
      for (const [key, val] of Object.entries(this.doc.variables.colors)) {
        const row = document.createElement('div');
        row.className = 'token-row';
        const colorVal = typeof val === 'object' ? val[mode] : val;
        row.innerHTML = `
          <div style="display: flex; align-items: center; gap: 8px;">
            <div style="width: 16px; height: 16px; border-radius: 4px; background: ${colorVal}; border: 1px solid var(--border-subtle);"></div>
            <span class="token-name">${key}</span>
          </div>
          <span style="font-family: var(--font-mono); font-size: 11px; color: var(--text-secondary);">${colorVal}</span>
        `;
        container.appendChild(row);
      }
    };

    document.getElementById('btn-tokens-modal')?.addEventListener('click', () => {
      backdrop.classList.add('active');
      renderTokens();
    });

    document.getElementById('btn-close-tokens')?.addEventListener('click', () => {
      backdrop.classList.remove('active');
    });

    document.getElementById('btn-mode-dark')?.addEventListener('click', () => {
      document.getElementById('btn-mode-dark').classList.add('active');
      document.getElementById('btn-mode-light').classList.remove('active');
      this.doc.variables.activeMode = 'dark';
      renderTokens();
      this.showToast('Switched to Dark Mode Tokens');
    });

    document.getElementById('btn-mode-light')?.addEventListener('click', () => {
      document.getElementById('btn-mode-light').classList.add('active');
      document.getElementById('btn-mode-dark').classList.remove('active');
      this.doc.variables.activeMode = 'light';
      renderTokens();
      this.showToast('Switched to Light Mode Tokens');
    });
  }

  getNodeIconSvg(node) {
    switch (node.type) {
      case 'FRAME':
        return `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M4 8h16M4 16h16M8 4v16M16 4v16"/></svg>`;
      case 'COMPONENT':
        return `<span style="color:#c084fc;font-weight:700;font-size:12px;">❖</span>`;
      case 'INSTANCE':
        return `<span style="color:#c084fc;font-weight:700;font-size:12px;">◇</span>`;
      case 'TEXT':
        return `<span style="font-weight:800;font-size:11px;font-family:serif;">T</span>`;
      case 'VECTOR':
        return `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m12 19 7-7 3 3-7 7-3-3z"/><path d="m18 13-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"/></svg>`;
      case 'RECTANGLE':
        return `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="5" width="18" height="14" rx="2"/></svg>`;
      case 'ELLIPSE':
        return `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/></svg>`;
      case 'BOOLEAN_OPERATION':
        return `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h9v4h7v12H9v-4H4V4z"/></svg>`;
      default:
        return `<span style="font-size:10px;">▭</span>`;
    }
  }

  updateLayersPanel() {
    const list = document.getElementById('layers-tree');
    if (!list) return;
    list.innerHTML = '';

    // Auto-expand ancestors of selected nodes so user can always see selection
    for (const sel of this.controller.selectedNodes) {
      let curr = sel.parent;
      while (curr && curr.type !== 'DOCUMENT') {
        this.collapsedNodeIds.delete(curr.id);
        curr = curr.parent;
      }
    }

    const eyeOpenSvg = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>`;
    const eyeClosedSvg = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61M2 2l20 20"/></svg>`;
    const lockClosedSvg = `<svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><rect x="4" y="11" width="16" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4" fill="none" stroke="currentColor" stroke-width="2"/></svg>`;
    const lockOpenSvg = `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="4" y="11" width="16" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 9.9-1"/></svg>`;

    const buildTree = (node, depth = 0) => {
      if (node.type === 'DOCUMENT') {
        for (const child of node.children) buildTree(child, 0);
        return;
      }

      const isSelected = this.controller.selectedNodes.includes(node);
      const isHidden = node.visible === false;
      const isLocked = !!node.locked;
      const hasChildren = node.children && node.children.length > 0;
      const isCollapsed = this.collapsedNodeIds.has(node.id);

      const item = document.createElement('div');
      item.className = `layer-item ${isSelected ? 'selected' : ''} ${
        node.type === 'COMPONENT' ? 'is-component' : ''
      } ${isHidden ? 'is-hidden has-hidden' : ''} ${isLocked ? 'has-locked' : ''}`;
      item.style.paddingLeft = `${6 + depth * 14}px`;

      // Chevron
      const chevron = document.createElement('span');
      chevron.className = `layer-chevron ${hasChildren ? '' : 'empty'}`;
      chevron.innerText = hasChildren ? (isCollapsed ? '▶' : '▼') : '';
      if (hasChildren) {
        chevron.addEventListener('click', (e) => {
          e.stopPropagation();
          if (this.collapsedNodeIds.has(node.id)) {
            this.collapsedNodeIds.delete(node.id);
          } else {
            this.collapsedNodeIds.add(node.id);
          }
          this.updateLayersPanel();
        });
      }
      item.appendChild(chevron);

      // Icon
      const icon = document.createElement('span');
      icon.className = 'layer-icon';
      icon.innerHTML = this.getNodeIconSvg(node);
      item.appendChild(icon);

      // Title
      const title = document.createElement('span');
      title.className = 'layer-title';
      title.innerText = node.name;
      title.title = 'Double-click to rename';
      title.addEventListener('dblclick', (e) => {
        e.stopPropagation();
        const input = document.createElement('input');
        input.type = 'text';
        input.value = node.name;
        input.style.cssText =
          'background:#18181b;color:#f4f4f5;border:1px solid #0d99ff;border-radius:2px;font-size:11.5px;padding:1px 4px;width:100%;outline:none;';

        const finishRename = () => {
          const val = input.value.trim();
          if (val) node.name = val;
          this.updateLayersPanel();
          if (this.controller.selectedNodes.includes(node)) {
            this.updatePropertyInspector();
          }
        };

        input.addEventListener('keydown', (ke) => {
          if (ke.key === 'Enter') finishRename();
          if (ke.key === 'Escape') this.updateLayersPanel();
        });
        input.addEventListener('blur', finishRename);

        title.replaceWith(input);
        input.focus();
        input.select();
      });
      item.appendChild(title);

      // Child Count Badge (for containers)
      if (hasChildren) {
        const badge = document.createElement('span');
        badge.className = 'layer-badge';
        badge.innerText = node.children.length;
        badge.title = `${node.children.length} nested layers`;
        item.appendChild(badge);
      }

      // Actions Container (Eye Visibility & Lock)
      const actions = document.createElement('div');
      actions.className = 'layer-actions';

      // Eye Visibility Toggle
      const btnEye = document.createElement('button');
      btnEye.className = `layer-action-btn ${isHidden ? 'active' : ''}`;
      btnEye.title = isHidden ? 'Show layer' : 'Hide layer';
      btnEye.innerHTML = isHidden ? eyeClosedSvg : eyeOpenSvg;
      btnEye.addEventListener('click', (e) => {
        e.stopPropagation();
        node.visible = (node.visible === false);
        this.updateLayersPanel();
      });
      actions.appendChild(btnEye);

      // Lock Toggle
      const btnLock = document.createElement('button');
      btnLock.className = `layer-action-btn ${isLocked ? 'active' : ''}`;
      btnLock.title = isLocked ? 'Unlock layer' : 'Lock layer';
      btnLock.innerHTML = isLocked ? lockClosedSvg : lockOpenSvg;
      btnLock.addEventListener('click', (e) => {
        e.stopPropagation();
        node.locked = !node.locked;
        this.updateLayersPanel();
      });
      actions.appendChild(btnLock);

      item.appendChild(actions);

      // Row Selection Click
      item.addEventListener('click', (e) => {
        e.stopPropagation();
        if (e.shiftKey) {
          const sel = this.controller.selectedNodes;
          if (sel.includes(node)) {
            this.controller.setSelection(sel.filter((n) => n !== node));
          } else {
            this.controller.setSelection([...sel, node]);
          }
        } else {
          this.controller.setSelection([node]);
        }
      });

      list.appendChild(item);

      // Recurse into children if not collapsed
      if (hasChildren && !isCollapsed) {
        for (const child of node.children) {
          buildTree(child, depth + 1);
        }
      }
    };

    buildTree(this.doc.root);
  }

  updatePropertyInspector() {
    const node = this.controller.selectedNodes[0];
    const propsContainer = document.getElementById('design-props-section');
    if (!propsContainer) return;

    if (!node) {
      propsContainer.style.opacity = '0.5';
      propsContainer.style.pointerEvents = 'none';
      return;
    }

    propsContainer.style.opacity = '1.0';
    propsContainer.style.pointerEvents = 'auto';

    const badge = document.getElementById('prop-node-badge');
    if (badge) {
      badge.innerText = node.type;
    }

    document.getElementById('prop-x').value = Math.round(node.x);
    document.getElementById('prop-y').value = Math.round(node.y);
    document.getElementById('prop-w').value = Math.round(node.width);
    document.getElementById('prop-h').value = Math.round(node.height);
    document.getElementById('prop-radius').value = node.cornerRadius || 0;
    document.getElementById('prop-opacity').value = Math.round(node.opacity * 100);

    const fillInput = document.getElementById('prop-fill');
    const colorPicker = document.getElementById('prop-color-picker');
    if (fillInput && colorPicker && node.fill) {
      fillInput.value = node.fill;
      if (node.fill.startsWith('#') && node.fill.length === 7) {
        colorPicker.value = node.fill;
      }
    }

    const strokeInput = document.getElementById('prop-stroke');
    const strokePicker = document.getElementById('prop-stroke-picker');
    const strokeWidthInput = document.getElementById('prop-stroke-width');
    if (strokeInput && strokeWidthInput) {
      strokeInput.value = node.stroke || '';
      strokeWidthInput.value = node.strokeWidth || 1;
      if (node.stroke && node.stroke.startsWith('#') && node.stroke.length === 7) {
        strokePicker.value = node.stroke;
      }
    }

    // Typography section
    const typoSection = document.getElementById('typography-section');
    if (node.type === 'TEXT') {
      typoSection.style.display = 'block';
      document.getElementById('prop-text-content').value = node.text || '';
      document.getElementById('prop-font-size').value = node.fontSize || 16;
      document.getElementById('prop-font-weight').value = node.fontWeight || '400';
    } else {
      typoSection.style.display = 'none';
    }

    // Auto-Layout Section
    const alToggle = document.getElementById('toggle-auto-layout');
    const alDetails = document.getElementById('auto-layout-details');
    const alSection = document.getElementById('auto-layout-section');

    if (node.type === 'FRAME' || node.type === 'COMPONENT') {
      alSection.style.display = 'block';
      alToggle.checked = node.autoLayout && node.autoLayout.enabled;
      alDetails.style.display = node.autoLayout && node.autoLayout.enabled ? 'block' : 'none';
      if (node.autoLayout) {
        document.getElementById('prop-al-gap').value = node.autoLayout.gap || 12;
        document.getElementById('prop-al-padding').value = node.autoLayout.paddingTop || 16;
      }
    } else {
      alSection.style.display = 'none';
    }
  }

  insertComponentInstance(compType) {
    const screenCenter = this.renderer.screenToWorld(this.renderer.width / 2, this.renderer.height / 2);
    let newNode = null;

    if (compType === 'button-primary') {
      const btn = new RectangleNode('Button Instance (Primary)', 180, 44);
      btn.x = screenCenter.x - 90;
      btn.y = screenCenter.y - 22;
      btn.cornerRadius = 10;
      btn.fill = '#0d99ff';
      const label = new TextNode('Action Button 🥾', 'Btn Label');
      label.x = 36;
      label.y = 14;
      label.fontSize = 13;
      label.fontWeight = '700';
      label.fill = '#ffffff';
      btn.addChild(label);
      newNode = btn;
    } else if (compType === 'difficulty-pill') {
      const pill = new RectangleNode('Difficulty Tag Instance', 84, 24);
      pill.x = screenCenter.x - 42;
      pill.y = screenCenter.y - 12;
      pill.cornerRadius = 12;
      pill.fill = '#ecfdf5';
      pill.stroke = '#10b981';
      const pText = new TextNode('MODERATE', 'Tag Text');
      pText.x = 10;
      pText.y = 6;
      pText.fontSize = 9;
      pText.fontWeight = '800';
      pText.fill = '#059669';
      pill.addChild(pText);
      newNode = pill;
    } else if (compType === 'trail-card') {
      const card = new RectangleNode('Trail Card Instance', 320, 180);
      card.x = screenCenter.x - 160;
      card.y = screenCenter.y - 90;
      card.cornerRadius = 18;
      card.fill = '#ffffff';
      card.stroke = '#e2e8f0';
      card.effects = [{ type: 'drop-shadow', x: 0, y: 8, blur: 20, color: 'rgba(0,0,0,0.08)' }];
      const header = new RectangleNode('Mountain Header', 320, 100);
      header.x = 0;
      header.y = 0;
      header.cornerRadius = 18;
      header.fill = '#0284c7';
      card.addChild(header);
      const title = new TextNode('Alpine Glacier Pass', 'Card Title');
      title.x = 16;
      title.y = 114;
      title.fontSize = 15;
      title.fontWeight = '800';
      title.fill = '#0f172a';
      card.addChild(title);
      newNode = card;
    } else if (compType === 'tab-bar') {
      const bar = new RectangleNode('Frosted Tab Bar Instance', 345, 60);
      bar.x = screenCenter.x - 172;
      bar.y = screenCenter.y - 30;
      bar.cornerRadius = 20;
      bar.fill = 'rgba(255, 255, 255, 0.9)';
      bar.stroke = '#e2e8f0';
      const icons = new TextNode('🏠 Home     🔍 Explore     ♡ Saved     👤 Profile', 'Tab Icons');
      icons.x = 42;
      icons.y = 22;
      icons.fontSize = 12;
      icons.fontWeight = '600';
      icons.fill = '#0f172a';
      bar.addChild(icons);
      newNode = bar;
    }

    if (newNode) {
      this.doc.addNode(newNode);
      this.controller.setSelection([newNode]);
      this.updateLayersPanel();
      this.showToast(`Inserted component instance: ${newNode.name}`);
    }
  }

  updateDevModeCode() {
    const codeBlock = document.getElementById('dev-code-preview');
    if (!codeBlock) return;
    const node = this.controller.selectedNodes[0];

    if (!node) {
      codeBlock.innerText = '/* Select any layer on canvas to inspect code */';
      return;
    }

    switch (this.activeDevLang) {
      case 'css':
        codeBlock.innerText = ExportEngine.generateCSS(node);
        break;
      case 'react':
        if (node.name.includes('Trail') || node.name.includes('Cascade') || node.name.includes('Card') || node.name.includes('Banner')) {
          codeBlock.innerText = `// FigCraft Dev Mode Inspect — React (TypeScript)
// Ready for dev · Ridgeline Design System · Component Props Mapping

export interface TrailRowProps {
  title: string;
  distance: string;
  elevation: string;
  difficulty: 'Easy' | 'Moderate' | 'Hard';
  imageUrl?: string;
}

export function TrailRow({ title, distance, elevation, difficulty, imageUrl }: TrailRowProps) {
  return (
    <div className="flex items-center justify-between p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 shadow-sm hover:shadow-md transition-all">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-xl bg-sky-600/10 text-sky-500 flex items-center justify-center font-bold text-base">
          🌲
        </div>
        <div>
          <h4 className="text-sm font-semibold text-slate-900 dark:text-zinc-100">{title}</h4>
          <p className="text-xs text-slate-500 dark:text-zinc-400">{distance} • {elevation}</p>
        </div>
      </div>
      <span className="px-2.5 py-1 text-xs rounded-full font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
        {difficulty}
      </span>
    </div>
  );
}`;
        } else {
          codeBlock.innerText = ExportEngine.generateReactTailwind(node);
        }
        break;
      case 'swiftui':
        codeBlock.innerText = ExportEngine.generateSwiftUI(node);
        break;
      case 'svg':
        codeBlock.innerText = ExportEngine.nodeToSVGElement(node, 0, 0);
        break;
    }
  }

  startRenderLoop() {
    const loop = () => {
      this.renderer.render(
        this.doc,
        this.controller.selectedNodes,
        this.controller.hoveredNode
      );
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }
}

// Launch FigCraft Studio on Window Load
window.addEventListener('DOMContentLoaded', () => {
  window.figCraftApp = new FigCraftApp();
});
