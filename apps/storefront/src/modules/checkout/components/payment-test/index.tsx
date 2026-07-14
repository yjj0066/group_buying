"use client"

import { Badge } from "@modules/common/components/ui"
import { useDictionary } from "@i18n/provider"

const PaymentTest = ({ className }: { className?: string }) => {
  const t = useDictionary()

  return (
    <Badge color="orange" className={className}>
      <span className="font-semibold">{t.checkout.testBadgeAttention}</span>{" "}
      {t.checkout.testBadgeNote}
    </Badge>
  )
}

export default PaymentTest
