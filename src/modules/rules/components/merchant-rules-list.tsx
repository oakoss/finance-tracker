import type { MerchantRuleListItem } from '@/modules/rules/api/list-merchant-rules';

import { ruleStageEnum } from '@/modules/rules/db/schema';

import { StageSection } from './stage-section';

type MerchantRulesListProps = { rules: MerchantRuleListItem[] };

export function MerchantRulesList({ rules }: MerchantRulesListProps) {
  return (
    <div className="flex flex-col gap-4">
      {ruleStageEnum.enumValues.map((stage) => (
        <StageSection
          key={stage}
          rows={rules.filter((r) => r.stage === stage)}
          stage={stage}
        />
      ))}
    </div>
  );
}
