import type { MockAgentResponse, AgentType } from "@/domain/agents/types";
import type { DemoState, OrganizationId } from "@/domain/demo/types";

export interface AIProviderInput {
  state: DemoState;
  organizationId: OrganizationId;
  findingId: string;
  agentType: AgentType;
}

/**
 * Replaceable boundary for a future governed AI service.
 * The demo implementation is deterministic and performs no network request.
 */
export interface AIProvider {
  analyzeFinding(input: AIProviderInput): Promise<MockAgentResponse>;
}
