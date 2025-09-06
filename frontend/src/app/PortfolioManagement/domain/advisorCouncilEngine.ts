/**
 * Advisor Council Engine (Refactored)
 * This file now serves as a compatibility layer and re-exports the main engine
 * All classes have been split into focused modules in the ./advisor directory
 */

// Re-export everything from the new organized structure
export { AdvisorCouncilEngine } from './advisor/advisorCouncilEngine';
export type { 
  AssetClass, 
  RiskLevel, 
  CouncilAnswers, 
  AllocationResult,
  Signal,
  StressTestResult
} from './advisor/types';

// Legacy compatibility - import the actual engine for any legacy usage
import { AdvisorCouncilEngine } from './advisor/advisorCouncilEngine';

// Export a default instance for backward compatibility if needed
export default AdvisorCouncilEngine;