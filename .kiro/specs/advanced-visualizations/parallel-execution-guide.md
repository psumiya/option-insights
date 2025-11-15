# Parallel Execution Guide for Advanced Visualizations

## Overview

This guide provides instructions for executing the 8 visualization tasks in parallel across multiple Kiro sessions. Task 13 (Analytics Engine) has been completed and provides the foundation for all visualizations.

## Prerequisites

✅ Task 13 (Analytics Engine methods) - **COMPLETED**

## Parallel Execution Strategy

### Phase 2: Visualizations (Can run in parallel)

Open 8 separate Kiro chat sessions and assign one visualization to each session:

---

## Session 1: HeatmapCalendarChart

**Prompt to use:**
```
Execute task 5 from .kiro/specs/advanced-visualizations/tasks.md - Implement HeatmapCalendarChart visualization. 

Read the requirements, design, and tasks files first, then implement all 3 sub-tasks:
- 5.1 Create HeatmapCalendarChart class with base structure
- 5.2 Implement calendar grid layout and rendering  
- 5.3 Add interactivity and data updates

Create the file js/heatmap-calendar-chart.js following the design specifications.
```

**Expected Output:** `js/heatmap-calendar-chart.js`

---

## Session 2: ScatterPlotChart

**Prompt to use:**
```
Execute task 6 from .kiro/specs/advanced-visualizations/tasks.md - Implement ScatterPlotChart visualization.

Read the requirements, design, and tasks files first, then implement all 3 sub-tasks:
- 6.1 Create ScatterPlotChart class with axes
- 6.2 Render scatter points and legend
- 6.3 Add interactivity

Create the file js/scatter-plot-chart.js following the design specifications.
```

**Expected Output:** `js/scatter-plot-chart.js`

---

## Session 3: BubbleChart

**Prompt to use:**
```
Execute task 7 from .kiro/specs/advanced-visualizations/tasks.md - Implement BubbleChart visualization.

Read the requirements, design, and tasks files first, then implement all 3 sub-tasks:
- 7.1 Create BubbleChart class with quadrant layout
- 7.2 Render bubbles with sizing and coloring
- 7.3 Add interactivity

Create the file js/bubble-chart.js following the design specifications.
```

**Expected Output:** `js/bubble-chart.js`

---

## Session 4: ViolinPlotChart

**Prompt to use:**
```
Execute task 8 from .kiro/specs/advanced-visualizations/tasks.md - Implement ViolinPlotChart visualization.

Read the requirements, design, and tasks files first, then implement all 3 sub-tasks:
- 8.1 Create ViolinPlotChart class with distribution calculation
- 8.2 Render violin shapes and box plots
- 8.3 Add interactivity

Create the file js/violin-plot-chart.js following the design specifications.
```

**Expected Output:** `js/violin-plot-chart.js`

---

## Session 5: WaterfallChart

**Prompt to use:**
```
Execute task 9 from .kiro/specs/advanced-visualizations/tasks.md - Implement WaterfallChart visualization.

Read the requirements, design, and tasks files first, then implement all 3 sub-tasks:
- 9.1 Create WaterfallChart class with cumulative calculation
- 9.2 Render waterfall bars and connectors
- 9.3 Add interactivity

Create the file js/waterfall-chart.js following the design specifications.
```

**Expected Output:** `js/waterfall-chart.js`

---

## Session 6: RadialChart

**Prompt to use:**
```
Execute task 10 from .kiro/specs/advanced-visualizations/tasks.md - Implement RadialChart visualization.

Read the requirements, design, and tasks files first, then implement all 3 sub-tasks:
- 10.1 Create RadialChart class with circular layout
- 10.2 Render radial areas and legend
- 10.3 Add interactivity

Create the file js/radial-chart.js following the design specifications.
```

**Expected Output:** `js/radial-chart.js`

---

## Session 7: SankeyDiagramChart

**Prompt to use:**
```
Execute task 11 from .kiro/specs/advanced-visualizations/tasks.md - Implement SankeyDiagramChart visualization.

Read the requirements, design, and tasks files first, then implement all 3 sub-tasks:
- 11.1 Create SankeyDiagramChart class with node/link structure
- 11.2 Render Sankey diagram
- 11.3 Add interactivity

Create the file js/sankey-diagram-chart.js following the design specifications.
```

**Expected Output:** `js/sankey-diagram-chart.js`

---

## Session 8: HorizonChart

**Prompt to use:**
```
Execute task 12 from .kiro/specs/advanced-visualizations/tasks.md - Implement HorizonChart visualization.

Read the requirements, design, and tasks files first, then implement all 3 sub-tasks:
- 12.1 Create HorizonChart class with layered areas
- 12.2 Render horizon layers
- 12.3 Add interactivity

Create the file js/horizon-chart.js following the design specifications.
```

**Expected Output:** `js/horizon-chart.js`

---

## After All Sessions Complete

Once all 8 visualization files are created, return to this session (or open a new one) and execute the remaining tasks sequentially:

### Phase 3: Additional Features (Can run in parallel)

**Session A:**
```
Execute task 15 from .kiro/specs/advanced-visualizations/tasks.md - Implement export functionality
```

**Session B:**
```
Execute task 16 from .kiro/specs/advanced-visualizations/tasks.md - Add responsive design for mobile devices
```

### Phase 4: Integration (Must run sequentially)

```
Execute tasks 14, 17, 18, 19, and 20 from .kiro/specs/advanced-visualizations/tasks.md in order:
- Task 14: Register all visualizations
- Task 17: Update DashboardController
- Task 18: Add CSS styles
- Task 19: Update index.html
- Task 20: Test filter integration
```

## Progress Tracking

Mark tasks as complete in `.kiro/specs/advanced-visualizations/tasks.md` as each session finishes.

## Notes

- Each visualization is independent and can be developed simultaneously
- All visualizations follow the same interface pattern (constructor, update, resize, destroy)
- All visualizations use the analytics engine methods from Task 13
- Each session should read the requirements.md, design.md, and tasks.md files for context
