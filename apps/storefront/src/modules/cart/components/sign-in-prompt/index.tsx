"use client"

import { Button, Heading, Text } from "@modules/common/components/ui"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { useDictionary } from "@i18n/provider"

const SignInPrompt = () => {
  const t = useDictionary()

  return (
    <div className="bg-white flex items-center justify-between">
      <div>
        <Heading level="h2" className="txt-xlarge">
          {t.cart.signInTitle}
        </Heading>
        <Text className="txt-medium text-ui-fg-subtle mt-2">
          {t.cart.signInSubtitle}
        </Text>
      </div>
      <div>
        <LocalizedClientLink href="/account">
          <Button variant="secondary" className="h-10" data-testid="sign-in-button">
            {t.cart.signIn}
          </Button>
        </LocalizedClientLink>
      </div>
    </div>
  )
}

export default SignInPrompt
