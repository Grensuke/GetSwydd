"use client";

import { Field, Select } from "@/components/ui";
import { PERSONAL_STAGE_MAP, PERSONAL_STAGES_LIST, type PersonalStage } from "@/lib/applications/status";

interface MoveStageMenuProps {
  currentPersonalStage: PersonalStage | null;
  onSelectStage: (stage: PersonalStage | null) => void;
}

export function MoveStageMenu({ currentPersonalStage, onSelectStage }: MoveStageMenuProps) {
  return (
    <Field label="Personal stage">
      {({ id }) => (
        <Select
          id={id}
          value={currentPersonalStage ?? ""}
          className="min-h-9 text-xs"
          onChange={(event) => {
            const stage = PERSONAL_STAGES_LIST.find((option) => option === event.currentTarget.value);
            onSelectStage(stage ?? null);
          }}
        >
          <option value="">Use confirmed stage</option>
          {PERSONAL_STAGES_LIST.map((stage) => (
            <option key={stage} value={stage}>{PERSONAL_STAGE_MAP[stage].label}</option>
          ))}
        </Select>
      )}
    </Field>
  );
}
