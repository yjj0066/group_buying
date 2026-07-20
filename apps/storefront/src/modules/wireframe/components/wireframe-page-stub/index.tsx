import { BbBadge, BbCard, BbSectionHeader } from "@modules/design-system"
import {
  WIREFRAME_DOMAIN_LABELS,
  type WireframeDomain,
} from "@lib/wireframe/screens"

type WireframePageStubProps = {
  screenId: string
  screenName: string
  domain: WireframeDomain
  priority?: "P0" | "P1" | "P2"
  variant?: boolean
  description?: string
}

const WireframePageStub = ({
  screenId,
  screenName,
  domain,
  priority = "P0",
  variant = false,
  description,
}: WireframePageStubProps) => (
  <div className="flex flex-col gap-4">
    <div className="flex flex-wrap items-center gap-2">
      <BbBadge variant="purple">{screenId}</BbBadge>
      <BbBadge variant={variant ? "warning" : "default"}>
        {variant ? "상태 화면" : priority}
      </BbBadge>
      <BbBadge variant="trust">{WIREFRAME_DOMAIN_LABELS[domain]}</BbBadge>
    </div>

    <BbSectionHeader
      title={screenName}
      subtitle={description ?? "와이어프레임 화면 — UI 구현 예정"}
    />

    <BbCard tone="gradient" padding="lg">
      <p className="text-sm leading-relaxed text-[var(--bb-mute)]">
        이 페이지는 화면정의서 v3 기준 라우팅 골격입니다. 디자인 시스템
        컴포넌트를 조합해 화면을 채워 넣을 예정입니다.
      </p>
    </BbCard>
  </div>
)

export default WireframePageStub
