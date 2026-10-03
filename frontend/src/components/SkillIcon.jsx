import { FiCode } from "react-icons/fi";
import { skillIcons } from "../utils/skillIcons";
import { resolveSkillKey } from "../utils/skillNames";

export const hasSkillIcon = (name) =>
  Object.hasOwn(skillIcons, resolveSkillKey(name));
export default function SkillIcon({ name, iconKey }) {
  const key = iconKey || resolveSkillKey(name);
  const Icon = Object.hasOwn(skillIcons, key) ? skillIcons[key] : FiCode;
  return <Icon aria-hidden="true" focusable="false" />;
}
