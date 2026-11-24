import { executeAgentTool, toolsForAgent } from "@/application/agents/tool-registry";
import type { AIProvider, AIProviderInput } from "@/data/ports/ai-provider";

export class MockAIProvider implements AIProvider {
  async analyzeFinding({ state, organizationId, findingId, agentType }: AIProviderInput) {
    const finding = state.findings.find(item => item.id === findingId && item.organizationId === organizationId);
    if (!finding) throw new Error("الملاحظة الرقابية لا تخص الشركة الحالية.");
    const rule = state.controlRules.find(item => item.id === finding.ruleId);
    const toolCalls = toolsForAgent(agentType).map(tool => executeAgentTool(state, organizationId, findingId, agentType, tool));
    const completed = toolCalls.filter(item => item.status === "COMPLETED");
    return {
      output: `تحليل محاكى قائم على ${completed.length} قراءة فعلية داخل الذاكرة. القاعدة ${finding.ruleId} تشير إلى: ${finding.explanation} التوصية: ${rule?.recommendedActionAr ?? finding.recommendedAction} لا يملك هذا الوكيل صلاحية اعتماد أو ترحيل أي قيد.`,
      evidenceReferences: finding.evidence.map(item => item.referenceId),
      toolCalls,
      limitations: ["تحليل حتمي تجريبي بلا نموذج خارجي.", "لا اتصال بالإنترنت أو قاعدة بيانات.", "أي تصحيح يحتاج إنشاء قيد ثم اعتمادًا وترحيلًا بشريين."],
    };
  }
}
