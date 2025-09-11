/**
 * Game State Management for EcoSim
 * Manages research progression, scenarios, experiments, and achievements
 */

export interface Publication {
  id: string
  title: string
  description: string
  impactFactor: number
  citations: number
  publishDate: Date
  ecosystemType: string
  researchPoints: number
}

export interface Experiment {
  id: string
  title: string
  description: string
  startDay: number
  duration: number
  chunkIds: string[]
  interventions: ExperimentIntervention[]
  status: 'active' | 'completed' | 'failed'
  results?: ExperimentResults
}

export interface ExperimentIntervention {
  day: number
  type: 'plant' | 'irrigate' | 'cleanse' | 'weather' | 'monitor'
  chunkId: string
  parameters: Record<string, any>
}

export interface ExperimentResults {
  biodiversityChange: number
  stabilityChange: number
  speciesDiscovered: string[]
  interactionsObserved: string[]
  ecosystemServices: Record<string, number>
}

export interface Achievement {
  id: string
  name: string
  description: string
  icon: string
  unlockedDate?: Date
  progress: number
  maxProgress: number
  category: 'species' | 'ecosystem' | 'research' | 'challenge'
}

export interface ScenarioProgress {
  scenarioId: string
  objectives: ScenarioObjective[]
  score: number
  grade: 'F' | 'D' | 'C' | 'B' | 'A' | 'S'
  completionPercentage: number
  daysElapsed: number
}

export interface ScenarioObjective {
  id: string
  description: string
  type: 'species_count' | 'biodiversity' | 'stability' | 'pollution_level' | 'specific_species'
  target: number | string
  current: number | string
  completed: boolean
  weight: number
}

export interface DiscoveryEvent {
  type: 'species' | 'interaction' | 'hybrid' | 'behavior'
  speciesId?: string
  interactionType?: string
  description: string
  timestamp: Date
  chunkId: string
  significance: 'minor' | 'major' | 'breakthrough'
}

export class GameState {
  // Research progression
  public researchLevel: number = 1
  public researchPoints: number = 0
  public unlockedSpecies: Set<string> = new Set(['common_grass', 'white_clover'])
  public unlockedTools: Set<string> = new Set(['plant', 'irrigate', 'monitor'])
  public publications: Publication[] = []
  
  // Current scenario
  public currentScenario: string = 'abandoned_field'
  public scenarioProgress: ScenarioProgress | null = null
  public startDate: Date = new Date()
  public currentDay: number = 0
  public gameSpeed: 'paused' | 'slow' | 'normal' | 'fast' = 'normal'
  
  // Ecosystem metrics
  public ecosystemHealth: number = 0.3 // Starting low for restoration scenarios
  public biodiversityIndex: number = 0.1
  public stabilityScore: number = 0.2
  public carbonSequestration: number = 0
  public pollinationEfficiency: number = 0
  
  // Experiments and research
  public activeExperiments: Experiment[] = []
  public completedExperiments: Experiment[] = []
  public recentDiscoveries: DiscoveryEvent[] = []
  
  // Achievements and progression
  public achievements: Achievement[] = []
  public totalScore: number = 0
  public gamesPlayed: number = 0
  public bestScores: Record<string, number> = {}
  
  private static instance: GameState
  
  public static getInstance(): GameState {
    if (!GameState.instance) {
      GameState.instance = new GameState()
    }
    return GameState.instance
  }
  
  /**
   * Initialize a new scenario
   */
  public startScenario(scenarioId: string): void {
    this.currentScenario = scenarioId
    this.startDate = new Date()
    this.currentDay = 0
    this.activeExperiments = []
    this.recentDiscoveries = []
    
    // Initialize scenario-specific objectives
    this.scenarioProgress = this.createScenarioProgress(scenarioId)
    
    // Reset ecosystem metrics for new scenario
    this.ecosystemHealth = this.getScenarioStartingHealth(scenarioId)
    this.biodiversityIndex = this.getScenarioStartingDiversity(scenarioId)
    this.stabilityScore = this.getScenarioStartingStability(scenarioId)
  }
  
  /**
   * Update game state each simulation day
   */
  public updateDaily(simulationStats: any): void {
    this.currentDay++
    
    // Update ecosystem metrics
    this.ecosystemHealth = simulationStats.avgVitality || 0
    this.biodiversityIndex = this.calculateBiodiversityIndex(simulationStats)
    this.stabilityScore = this.calculateStabilityScore(simulationStats)
    this.carbonSequestration = this.calculateCarbonSequestration(simulationStats)
    
    // Update scenario progress
    this.updateScenarioProgress(simulationStats)
    
    // Update experiments
    this.updateExperiments()
    
    // Check for achievements
    this.checkAchievements()
    
    // Award research points
    this.awardResearchPoints()
  }
  
  /**
   * Discover new species or interactions
   */
  public recordDiscovery(event: DiscoveryEvent): void {
    this.recentDiscoveries.unshift(event)
    
    // Keep only last 50 discoveries
    if (this.recentDiscoveries.length > 50) {
      this.recentDiscoveries = this.recentDiscoveries.slice(0, 50)
    }
    
    // Unlock species if not already unlocked
    if (event.type === 'species' && event.speciesId) {
      if (!this.unlockedSpecies.has(event.speciesId)) {
        this.unlockedSpecies.add(event.speciesId)
        this.researchPoints += this.getSpeciesDiscoveryPoints(event.speciesId)
      }
    }
  }
  
  /**
   * Start a new experiment
   */
  public startExperiment(experiment: Experiment): void {
    experiment.startDay = this.currentDay
    experiment.status = 'active'
    this.activeExperiments.push(experiment)
  }
  
  /**
   * Complete an experiment with results
   */
  public completeExperiment(experimentId: string, results: ExperimentResults): void {
    const exp = this.activeExperiments.find(e => e.id === experimentId)
    if (!exp) return
    
    exp.status = 'completed'
    exp.results = results
    
    // Move to completed experiments
    this.activeExperiments = this.activeExperiments.filter(e => e.id !== experimentId)
    this.completedExperiments.push(exp)
    
    // Award research points
    this.researchPoints += this.calculateExperimentPoints(exp, results)
    
    // Check if we can publish
    if (this.canPublishExperiment(exp)) {
      this.publishExperiment(exp)
    }
  }
  
  /**
   * Publish research for additional points and recognition
   */
  public publishExperiment(experiment: Experiment): Publication {
    const publication: Publication = {
      id: `pub_${experiment.id}`,
      title: this.generatePublicationTitle(experiment),
      description: experiment.description,
      impactFactor: this.calculateImpactFactor(experiment),
      citations: 0,
      publishDate: new Date(),
      ecosystemType: this.currentScenario,
      researchPoints: Math.floor(experiment.results!.biodiversityChange * 100)
    }
    
    this.publications.push(publication)
    this.researchPoints += publication.researchPoints
    
    // Check for research level advancement
    this.checkResearchLevelUp()
    
    return publication
  }
  
  /**
   * Check and unlock achievements
   */
  private checkAchievements(): void {
    // Species discovery achievements
    this.checkAchievement('species_collector_10', 'species', this.unlockedSpecies.size, 10)
    this.checkAchievement('species_collector_25', 'species', this.unlockedSpecies.size, 25)
    this.checkAchievement('species_collector_50', 'species', this.unlockedSpecies.size, 50)
    
    // Ecosystem health achievements
    this.checkAchievement('healthy_ecosystem', 'ecosystem', this.ecosystemHealth * 100, 80)
    this.checkAchievement('pristine_ecosystem', 'ecosystem', this.ecosystemHealth * 100, 95)
    
    // Research achievements
    this.checkAchievement('first_publication', 'research', this.publications.length, 1)
    this.checkAchievement('prolific_researcher', 'research', this.publications.length, 10)
    
    // Biodiversity achievements
    this.checkAchievement('biodiverse_paradise', 'ecosystem', this.biodiversityIndex * 100, 90)
  }
  
  private checkAchievement(id: string, category: Achievement['category'], current: number, target: number): void {
    let achievement = this.achievements.find(a => a.id === id)
    
    if (!achievement) {
      achievement = {
        id,
        name: this.getAchievementName(id),
        description: this.getAchievementDescription(id),
        icon: this.getAchievementIcon(id),
        progress: current,
        maxProgress: target,
        category
      }
      this.achievements.push(achievement)
    }
    
    achievement.progress = current
    
    if (current >= target && !achievement.unlockedDate) {
      achievement.unlockedDate = new Date()
      this.researchPoints += 50 // Bonus points for achievements
    }
  }
  
  /**
   * Calculate scenario completion score
   */
  public calculateScenarioScore(): number {
    if (!this.scenarioProgress) return 0
    
    let weightedScore = 0
    let totalWeight = 0
    
    for (const objective of this.scenarioProgress.objectives) {
      if (objective.completed) {
        weightedScore += 100 * objective.weight
      } else {
        // Partial credit based on progress
        const progress = typeof objective.current === 'number' && typeof objective.target === 'number'
          ? Math.min(objective.current / objective.target, 1)
          : 0
        weightedScore += progress * 100 * objective.weight
      }
      totalWeight += objective.weight
    }
    
    return totalWeight > 0 ? weightedScore / totalWeight : 0
  }
  
  /**
   * Get current research level requirements
   */
  public getResearchLevelRequirements(): { points: number; species: number; publications: number } {
    const level = this.researchLevel
    return {
      points: level * 500,
      species: level * 5,
      publications: Math.max(0, level - 1)
    }
  }
  
  /**
   * Check if player can advance to next research level
   */
  private checkResearchLevelUp(): void {
    const requirements = this.getResearchLevelRequirements()
    
    if (this.researchPoints >= requirements.points &&
        this.unlockedSpecies.size >= requirements.species &&
        this.publications.length >= requirements.publications) {
      this.researchLevel++
      this.unlockNewTools()
    }
  }
  
  /**
   * Save game state to local storage
   */
  public save(): void {
    const saveData = {
      researchLevel: this.researchLevel,
      researchPoints: this.researchPoints,
      unlockedSpecies: Array.from(this.unlockedSpecies),
      unlockedTools: Array.from(this.unlockedTools),
      publications: this.publications,
      achievements: this.achievements,
      totalScore: this.totalScore,
      gamesPlayed: this.gamesPlayed,
      bestScores: this.bestScores
    }
    
    localStorage.setItem('ecosim_save', JSON.stringify(saveData))
  }
  
  /**
   * Load game state from local storage
   */
  public load(): boolean {
    try {
      const saveData = localStorage.getItem('ecosim_save')
      if (!saveData) return false
      
      const data = JSON.parse(saveData)
      this.researchLevel = data.researchLevel || 1
      this.researchPoints = data.researchPoints || 0
      this.unlockedSpecies = new Set(data.unlockedSpecies || ['common_grass', 'white_clover'])
      this.unlockedTools = new Set(data.unlockedTools || ['plant', 'irrigate', 'monitor'])
      this.publications = data.publications || []
      this.achievements = data.achievements || []
      this.totalScore = data.totalScore || 0
      this.gamesPlayed = data.gamesPlayed || 0
      this.bestScores = data.bestScores || {}
      
      return true
    } catch (error) {
      console.error('Failed to load save data:', error)
      return false
    }
  }
  
  // Helper methods (implementation details)
  private createScenarioProgress(scenarioId: string): ScenarioProgress {
    const objectives = this.getScenarioObjectives(scenarioId)
    return {
      scenarioId,
      objectives,
      score: 0,
      grade: 'F',
      completionPercentage: 0,
      daysElapsed: 0
    }
  }
  
  private getScenarioObjectives(scenarioId: string): ScenarioObjective[] {
    // Define objectives for each scenario
    switch (scenarioId) {
      case 'abandoned_field':
        return [
          { id: 'diversity', description: 'Achieve 60% biodiversity', type: 'biodiversity', target: 0.6, current: 0, completed: false, weight: 0.4 },
          { id: 'stability', description: 'Maintain 70% ecosystem stability', type: 'stability', target: 0.7, current: 0, completed: false, weight: 0.3 },
          { id: 'species', description: 'Establish 8 different species', type: 'species_count', target: 8, current: 0, completed: false, weight: 0.3 }
        ]
      default:
        return []
    }
  }
  
  private getScenarioStartingHealth(scenarioId: string): number {
    switch (scenarioId) {
      case 'abandoned_field': return 0.3
      case 'polluted_pond': return 0.1
      case 'logged_forest': return 0.2
      default: return 0.3
    }
  }
  
  private getScenarioStartingDiversity(scenarioId: string): number {
    switch (scenarioId) {
      case 'abandoned_field': return 0.1
      case 'polluted_pond': return 0.05
      case 'logged_forest': return 0.15
      default: return 0.1
    }
  }
  
  private getScenarioStartingStability(scenarioId: string): number {
    switch (scenarioId) {
      case 'abandoned_field': return 0.2
      case 'polluted_pond': return 0.1
      case 'logged_forest': return 0.25
      default: return 0.2
    }
  }
  
  private calculateBiodiversityIndex(stats: any): number {
    return Math.min(1, (stats.diversity || 0) * 1.2)
  }
  
  private calculateStabilityScore(stats: any): number {
    return Math.min(1, (stats.avgVitality || 0) * (1 - (stats.avgPollution || 0)))
  }
  
  private calculateCarbonSequestration(stats: any): number {
    return (stats.totalSpecies || 0) * 2.5
  }
  
  private updateScenarioProgress(stats: any): void {
    if (!this.scenarioProgress) return
    
    // Update objective progress
    for (const objective of this.scenarioProgress.objectives) {
      switch (objective.type) {
        case 'biodiversity':
          objective.current = this.biodiversityIndex
          break
        case 'stability':
          objective.current = this.stabilityScore
          break
        case 'species_count':
          objective.current = stats.totalSpecies || 0
          break
      }
      
      objective.completed = typeof objective.current === 'number' && typeof objective.target === 'number'
        ? objective.current >= objective.target
        : objective.current === objective.target
    }
    
    this.scenarioProgress.score = this.calculateScenarioScore()
    this.scenarioProgress.completionPercentage = this.scenarioProgress.objectives
      .reduce((sum, obj) => sum + (obj.completed ? obj.weight : 0), 0)
    this.scenarioProgress.daysElapsed = this.currentDay
  }
  
  private updateExperiments(): void {
    this.activeExperiments.forEach(exp => {
      if (this.currentDay >= exp.startDay + exp.duration) {
        // Auto-complete experiment with basic results
        this.completeExperiment(exp.id, this.generateBasicResults())
      }
    })
  }
  
  private generateBasicResults(): ExperimentResults {
    return {
      biodiversityChange: Math.random() * 0.2 - 0.1,
      stabilityChange: Math.random() * 0.1,
      speciesDiscovered: [],
      interactionsObserved: [],
      ecosystemServices: {}
    }
  }
  
  private awardResearchPoints(): void {
    // Daily research points based on ecosystem health
    const dailyPoints = Math.floor(this.ecosystemHealth * 10)
    this.researchPoints += dailyPoints
  }
  
  private getSpeciesDiscoveryPoints(_speciesId: string): number {
    // More points for rare species
    const basePoints = { common: 10, uncommon: 25, rare: 50, legendary: 100 }
    return basePoints.common // Default, could be enhanced with species rarity data
  }
  
  private calculateExperimentPoints(_experiment: Experiment, results: ExperimentResults): number {
    return Math.floor(Math.abs(results.biodiversityChange) * 200)
  }
  
  private canPublishExperiment(experiment: Experiment): boolean {
    return experiment.results!.biodiversityChange > 0.1 || experiment.results!.stabilityChange > 0.1
  }
  
  private generatePublicationTitle(experiment: Experiment): string {
    const titles = [
      `${experiment.title}: A Field Study`,
      `Ecosystem Response to ${experiment.title}`,
      `Restoration Techniques: ${experiment.title}`,
      `Biodiversity Enhancement through ${experiment.title}`
    ]
    return titles[Math.floor(Math.random() * titles.length)]
  }
  
  private calculateImpactFactor(experiment: Experiment): number {
    return Math.round((Math.abs(experiment.results!.biodiversityChange) * 10) * 10) / 10
  }
  
  private unlockNewTools(): void {
    const levelTools = {
      2: ['cleanse', 'weather_monitor'],
      3: ['species_introduction', 'soil_modification'],
      4: ['hybrid_creation', 'genetic_rescue'],
      5: ['ecosystem_engineering', 'climate_modification']
    }
    
    const tools = levelTools[this.researchLevel as keyof typeof levelTools]
    if (tools) {
      tools.forEach(tool => this.unlockedTools.add(tool))
    }
  }
  
  private getAchievementName(id: string): string {
    const names: Record<string, string> = {
      'species_collector_10': 'Species Explorer',
      'species_collector_25': 'Species Specialist', 
      'species_collector_50': 'Master Naturalist',
      'healthy_ecosystem': 'Ecosystem Restorer',
      'pristine_ecosystem': 'Conservation Expert',
      'first_publication': 'Published Researcher',
      'prolific_researcher': 'Prolific Scientist',
      'biodiverse_paradise': 'Biodiversity Champion'
    }
    return names[id] || id
  }
  
  private getAchievementDescription(id: string): string {
    const descriptions: Record<string, string> = {
      'species_collector_10': 'Discover 10 different species',
      'species_collector_25': 'Discover 25 different species',
      'species_collector_50': 'Discover 50 different species',
      'healthy_ecosystem': 'Achieve 80% ecosystem health',
      'pristine_ecosystem': 'Achieve 95% ecosystem health',
      'first_publication': 'Publish your first research paper',
      'prolific_researcher': 'Publish 10 research papers',
      'biodiverse_paradise': 'Achieve 90% biodiversity index'
    }
    return descriptions[id] || id
  }
  
  private getAchievementIcon(id: string): string {
    const icons: Record<string, string> = {
      'species_collector_10': '🔬',
      'species_collector_25': '🧬',
      'species_collector_50': '🏆',
      'healthy_ecosystem': '🌱',
      'pristine_ecosystem': '🌿',
      'first_publication': '📄',
      'prolific_researcher': '📚',
      'biodiverse_paradise': '🦋'
    }
    return icons[id] || '🏅'
  }
}