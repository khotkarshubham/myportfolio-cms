import { FiCode } from "react-icons/fi";
import { skillIcons } from "../utils/skillIcons";
import { resolveSkillKey } from "../utils/skillNames";

export const hasSkillIcon = (name) =>
  Object.hasOwn(skillIcons, resolveSkillKey(name));
export default function SkillIcon({ name }) {
  const Icon = hasSkillIcon(name) ? skillIcons[resolveSkillKey(name)] : FiCode;
  return <Icon aria-hidden="true" focusable="false" />;
}
