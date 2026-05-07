import { Icon } from "./Icon";

export function EmptyState({ text }: { text: string }) {
  return (
    <section className="emptyState card">
      <Icon name="search" size={20} />
      <p>{text}</p>
    </section>
  );
}
