import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { useTutorialStore } from '@/stores/tutorialStore';
import { SimulationEngine } from '@/simulation/SimulationEngine';

describe('Tutorial Sequence E2E', () => {
  let tutorialStore: ReturnType<typeof useTutorialStore>;

  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();

    setActivePinia(createPinia());
    tutorialStore = useTutorialStore();

    new SimulationEngine({
      worldSize: { width: 3, height: 3 },
      chunkSize: 5,
      difficulty: 'normal',
      enableSeasons: false,
      enableHydrology: false
    });

    tutorialStore.initializeTutorial();
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('First-time User Experience', () => {
    it('should show welcome modal for first-time users', () => {
      expect(tutorialStore.hasSeenWelcome).toBe(false);
      expect(tutorialStore.showWelcomeModal).toBe(true);
    });

    it('should not show welcome modal for returning users', () => {
      // Simulate user dismissing welcome
      tutorialStore.dismissWelcome();

      // Reset store (simulating page reload)
      const newStore = useTutorialStore();
      newStore.initializeTutorial();

      expect(newStore.hasSeenWelcome).toBe(true);
      expect(newStore.showWelcomeModal).toBe(false);
    });

    it('should persist welcome dismissal to localStorage', () => {
      tutorialStore.dismissWelcome();

      const stored = localStorage.getItem('ecosim_has_seen_welcome');
      expect(stored).toBe('true');
    });
  });

  describe('Welcome Modal Interaction', () => {
    it('should start tutorial when user clicks "Start Tutorial"', () => {
      tutorialStore.startTutorial();

      expect(tutorialStore.showWelcomeModal).toBe(false);
      expect(tutorialStore.tutorialActive).toBe(true);
      expect(tutorialStore.currentStepIndex).toBe(0);
      expect(tutorialStore.showTooltip).toBe(true);
    });

    it('should skip tutorial when user clicks "Skip"', () => {
      tutorialStore.skipTutorial();

      expect(tutorialStore.showWelcomeModal).toBe(false);
      expect(tutorialStore.tutorialActive).toBe(false);
      expect(tutorialStore.showTooltip).toBe(false);
      expect(tutorialStore.hasSeenWelcome).toBe(true);
    });

    it('should dismiss welcome modal directly', () => {
      tutorialStore.dismissWelcome();

      expect(tutorialStore.showWelcomeModal).toBe(false);
      expect(tutorialStore.hasSeenWelcome).toBe(true);
    });
  });

  describe('Tutorial Step Progression', () => {
    beforeEach(() => {
      tutorialStore.startTutorial();
    });

    it('should show first tutorial step', () => {
      expect(tutorialStore.activeTooltip).toBeDefined();
      expect(tutorialStore.activeTooltip?.id).toBe('chunk_grid_intro');
      expect(tutorialStore.currentStepIndex).toBe(0);
    });

    it('should advance to next step when completing current step', () => {
      const firstStepId = tutorialStore.activeTooltip?.id;

      tutorialStore.completeCurrentStep();

      expect(tutorialStore.currentStepIndex).toBe(1);
      expect(tutorialStore.activeTooltip?.id).not.toBe(firstStepId);
      expect(tutorialStore.completedSteps.has('chunk_grid_intro')).toBe(true);
    });

    it('should progress through all tutorial steps', () => {
      const totalSteps = 5; // We defined 5 tutorial steps

      for (let i = 0; i < totalSteps; i++) {
        expect(tutorialStore.currentStepIndex).toBe(i);
        tutorialStore.completeCurrentStep();
      }

      // After completing all steps, tutorial should end
      expect(tutorialStore.tutorialActive).toBe(false);
      expect(tutorialStore.showTooltip).toBe(false);
      expect(tutorialStore.completedSteps.size).toBe(totalSteps);
    });

    it('should track completed steps', () => {
      tutorialStore.completeCurrentStep(); // Step 1
      tutorialStore.completeCurrentStep(); // Step 2

      expect(tutorialStore.completedSteps.size).toBe(2);
      expect(tutorialStore.completedSteps.has('chunk_grid_intro')).toBe(true);
    });

    it('should allow skipping tutorial mid-sequence', () => {
      tutorialStore.completeCurrentStep(); // Complete step 1
      expect(tutorialStore.currentStepIndex).toBe(1);

      tutorialStore.skipTutorial();

      expect(tutorialStore.tutorialActive).toBe(false);
      expect(tutorialStore.showTooltip).toBe(false);
      expect(tutorialStore.currentStepIndex).toBe(0); // Reset
    });
  });

  describe('Tooltip Content', () => {
    beforeEach(() => {
      tutorialStore.startTutorial();
    });

    it('should provide tooltip with target element', () => {
      const tooltip = tutorialStore.activeTooltip;

      expect(tooltip).toBeDefined();
      expect(tooltip?.targetElement).toBeTruthy();
      expect(tooltip?.targetElement).toMatch(/^[.#]/); // Should be CSS selector
    });

    it('should provide tooltip with title and content', () => {
      const tooltip = tutorialStore.activeTooltip;

      expect(tooltip).toBeDefined();
      expect(tooltip?.title).toBeTruthy();
      expect(tooltip?.content).toBeTruthy();
      expect(tooltip?.title.length).toBeGreaterThan(5);
      expect(tooltip?.content.length).toBeGreaterThan(10);
    });

    it('should provide tooltip with placement', () => {
      const tooltip = tutorialStore.activeTooltip;

      expect(tooltip).toBeDefined();
      expect(tooltip?.placement).toBeDefined();
      expect(['top', 'bottom', 'left', 'right']).toContain(tooltip?.placement);
    });

    it('should have different content for each step', () => {
      const titles = new Set<string>();
      const totalSteps = 5;

      for (let i = 0; i < totalSteps; i++) {
        const title = tutorialStore.activeTooltip?.title;
        expect(title).toBeTruthy();
        titles.add(title!);
        tutorialStore.completeCurrentStep();
      }

      // All steps should have unique titles
      expect(titles.size).toBe(totalSteps);
    });
  });

  describe('Contextual Tooltip Triggering', () => {
    beforeEach(() => {
      tutorialStore.startTutorial();
    });

    it('should trigger tooltips based on tick count', () => {
      // Skip to event log step (triggered at tick 10)
      while (tutorialStore.activeTooltip?.trigger?.type !== 'tick') {
        tutorialStore.completeCurrentStep();
      }

      const eventLogStep = tutorialStore.activeTooltip;
      expect(eventLogStep?.trigger?.type).toBe('tick');

      // Should not show yet (before trigger tick)
      const shouldShow = tutorialStore.triggerByTick(5);
      expect(shouldShow).toBe(false);

      // Should show at trigger tick
      const shouldShowNow = tutorialStore.triggerByTick(eventLogStep.trigger!.value as number);
      expect(shouldShowNow).toBe(true);
    });

    it('should trigger tooltips based on resource points', () => {
      // Find interventions step (triggered when points > 50)
      while (tutorialStore.activeTooltip?.trigger?.type !== 'resourcePoints') {
        tutorialStore.completeCurrentStep();
        if (!tutorialStore.tutorialActive) break;
      }

      if (tutorialStore.activeTooltip?.trigger?.type === 'resourcePoints') {
  
        // Should not show with low points
        const shouldShow = tutorialStore.triggerByResourcePoints(30);
        expect(shouldShow).toBe(false);

        // Should show with enough points
        const shouldShowNow = tutorialStore.triggerByResourcePoints(60);
        expect(shouldShowNow).toBe(true);
      }
    });

    it('should trigger tooltips based on species count', () => {
      // Find goals step (triggered when species > 0)
      while (tutorialStore.activeTooltip?.trigger?.type !== 'speciesCount') {
        tutorialStore.completeCurrentStep();
        if (!tutorialStore.tutorialActive) break;
      }

      if (tutorialStore.activeTooltip?.trigger?.type === 'speciesCount') {
  
        // Should not show with no species
        const shouldShow = tutorialStore.triggerBySpeciesCount(0);
        expect(shouldShow).toBe(false);

        // Should show with species
        const shouldShowNow = tutorialStore.triggerBySpeciesCount(1);
        expect(shouldShowNow).toBe(true);
      }
    });
  });

  describe('Tutorial State Persistence', () => {
    it('should persist completed steps to localStorage', () => {
      tutorialStore.startTutorial();
      tutorialStore.completeCurrentStep();
      tutorialStore.completeCurrentStep();

      const stored = localStorage.getItem('ecosim_completed_tutorial_steps');
      expect(stored).toBeTruthy();

      const steps = JSON.parse(stored!);
      expect(steps).toHaveLength(2);
    });

    it('should restore completed steps from localStorage', () => {
      // Manually set localStorage
      localStorage.setItem('ecosim_completed_tutorial_steps', JSON.stringify(['chunk_grid_intro', 'event_log_intro']));

      // Create new store instance
      const newStore = useTutorialStore();
      newStore.initializeTutorial();

      expect(newStore.completedSteps.size).toBe(2);
      expect(newStore.completedSteps.has('chunk_grid_intro')).toBe(true);
      expect(newStore.completedSteps.has('event_log_intro')).toBe(true);
    });

    it('should not re-show completed steps', () => {
      tutorialStore.startTutorial();
      const firstStepId = tutorialStore.activeTooltip?.id!;

      tutorialStore.completeCurrentStep();
      expect(tutorialStore.completedSteps.has(firstStepId)).toBe(true);

      // Create new store (simulating page reload)
      const newStore = useTutorialStore();
      newStore.initializeTutorial();
      newStore.startTutorial();

      // Should skip completed step
      expect(newStore.activeTooltip?.id).not.toBe(firstStepId);
    });
  });

  describe('Tutorial Reset', () => {
    it('should reset tutorial progress', () => {
      tutorialStore.startTutorial();
      tutorialStore.completeCurrentStep();
      tutorialStore.completeCurrentStep();

      expect(tutorialStore.completedSteps.size).toBeGreaterThan(0);

      tutorialStore.resetTutorial();

      expect(tutorialStore.completedSteps.size).toBe(0);
      expect(tutorialStore.currentStepIndex).toBe(0);
      expect(tutorialStore.tutorialActive).toBe(false);
      expect(tutorialStore.showTooltip).toBe(false);
    });

    it('should clear localStorage on reset', () => {
      tutorialStore.startTutorial();
      tutorialStore.completeCurrentStep();

      expect(localStorage.getItem('ecosim_completed_tutorial_steps')).toBeTruthy();

      tutorialStore.resetTutorial();

      expect(localStorage.getItem('ecosim_completed_tutorial_steps')).toBeNull();
    });

    it('should allow restarting tutorial after reset', () => {
      tutorialStore.startTutorial();
      tutorialStore.completeCurrentStep();
      tutorialStore.skipTutorial();

      tutorialStore.resetTutorial();
      tutorialStore.startTutorial();

      expect(tutorialStore.tutorialActive).toBe(true);
      expect(tutorialStore.currentStepIndex).toBe(0);
      expect(tutorialStore.activeTooltip?.id).toBe('chunk_grid_intro');
    });
  });

  describe('Edge Cases', () => {
    it('should handle completing tutorial when no steps remain', () => {
      tutorialStore.startTutorial();

      // Complete all steps
      for (let i = 0; i < 10; i++) { // More than total steps
        if (tutorialStore.tutorialActive) {
          tutorialStore.completeCurrentStep();
        }
      }

      // Should gracefully end tutorial
      expect(tutorialStore.tutorialActive).toBe(false);
      expect(tutorialStore.showTooltip).toBe(false);
    });

    it('should handle skip tutorial when not active', () => {
      expect(tutorialStore.tutorialActive).toBe(false);

      tutorialStore.skipTutorial(); // Should not throw error

      expect(tutorialStore.tutorialActive).toBe(false);
    });

    it('should handle complete step when not active', () => {
      expect(tutorialStore.tutorialActive).toBe(false);

      tutorialStore.completeCurrentStep(); // Should not throw error

      expect(tutorialStore.currentStepIndex).toBe(0);
    });

    it('should handle corrupted localStorage data', () => {
      localStorage.setItem('ecosim_completed_tutorial_steps', 'invalid json');

      const newStore = useTutorialStore();
      newStore.initializeTutorial();

      // Should handle gracefully and start fresh
      expect(newStore.completedSteps.size).toBe(0);
    });
  });

  describe('Complete Tutorial Flow', () => {
    it('should simulate complete first-time user experience', () => {
      // 1. User opens app for first time
      expect(tutorialStore.hasSeenWelcome).toBe(false);
      expect(tutorialStore.showWelcomeModal).toBe(true);

      // 2. User starts tutorial
      tutorialStore.startTutorial();
      expect(tutorialStore.showWelcomeModal).toBe(false);
      expect(tutorialStore.tutorialActive).toBe(true);

      // 3. User goes through each step
      const stepIds: string[] = [];
      while (tutorialStore.tutorialActive) {
        const stepId = tutorialStore.activeTooltip?.id;
        if (stepId) stepIds.push(stepId);

        tutorialStore.completeCurrentStep();
      }

      // 4. Tutorial completes
      expect(tutorialStore.tutorialActive).toBe(false);
      expect(tutorialStore.showTooltip).toBe(false);
      expect(stepIds.length).toBe(5); // All 5 steps seen

      // 5. User refreshes page
      const newStore = useTutorialStore();
      newStore.initializeTutorial();

      // 6. Welcome modal should not show again
      expect(newStore.showWelcomeModal).toBe(false);
      expect(newStore.hasSeenWelcome).toBe(true);
    });

    it('should simulate user skipping tutorial', () => {
      // 1. User opens app
      expect(tutorialStore.showWelcomeModal).toBe(true);

      // 2. User clicks skip
      tutorialStore.skipTutorial();

      // 3. Tutorial skipped
      expect(tutorialStore.showWelcomeModal).toBe(false);
      expect(tutorialStore.tutorialActive).toBe(false);
      expect(tutorialStore.hasSeenWelcome).toBe(true);

      // 4. User refreshes
      const newStore = useTutorialStore();
      newStore.initializeTutorial();

      // 5. No tutorial shown
      expect(newStore.showWelcomeModal).toBe(false);
    });
  });
});
