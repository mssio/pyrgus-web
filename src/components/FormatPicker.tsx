import { FORMAT_GROUPS, FORMAT_LABELS, type FormatId } from '../core/formats'
import {
  Dropdown,
  DropdownButton,
  DropdownHeading,
  DropdownItem,
  DropdownLabel,
  DropdownMenu,
  DropdownSection,
} from './catalyst/dropdown'
import { CheckIcon, ChevronDownIcon } from './icons'

export function FormatPicker({ value, onChange }: { value: FormatId; onChange: (id: FormatId) => void }) {
  return (
    <Dropdown>
      <DropdownButton outline aria-label={`Format: ${FORMAT_LABELS[value]}`}>
        {FORMAT_LABELS[value]}
        <ChevronDownIcon />
      </DropdownButton>
      <DropdownMenu anchor="bottom start">
        {FORMAT_GROUPS.map((group) => (
          <DropdownSection key={group.heading} aria-label={group.heading}>
            <DropdownHeading>{group.heading}</DropdownHeading>
            {group.ids.map((id) => (
              <DropdownItem key={id} onClick={() => onChange(id)}>
                <CheckIcon className={id === value ? undefined : 'invisible'} />
                <DropdownLabel>{FORMAT_LABELS[id]}</DropdownLabel>
              </DropdownItem>
            ))}
          </DropdownSection>
        ))}
      </DropdownMenu>
    </Dropdown>
  )
}
