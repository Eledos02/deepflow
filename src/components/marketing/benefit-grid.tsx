import {
  ChartIcon,
  ShieldIcon,
  TargetIcon,
} from "@/components/ui/icons";

type BenefitGridProps = {
  items: Array<{ title: string; description: string }>;
};

export function BenefitGrid({ items }: BenefitGridProps) {
  const icons = [TargetIcon, ShieldIcon, ChartIcon];

  return (
    <div className="benefit-grid">
      {items.map((item, index) => {
        const Icon = icons[index % icons.length];

        return (
          <article className="benefit-card" key={item.title}>
            <span className="benefit-card__number">0{index + 1}</span>
            <span className="benefit-card__icon">
              <Icon />
            </span>
            <h3>{item.title}</h3>
            <p>{item.description}</p>
          </article>
        );
      })}
    </div>
  );
}
