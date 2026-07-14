import {

  extractBillingPaymentFromOrder,

  isGroupDealCart,

  resolveGroupDealCartContext,

} from "../group-deal-checkout-payment"

import {

  resolveGroupDealPaymentProviderId,

  resolveGroupDealPaymentProviderKind,

} from "../group-deal-payment-provider"



describe("group-deal-checkout-payment", () => {

  it("detects group deal carts from metadata", () => {

    expect(

      isGroupDealCart({

        metadata: { group_deal_billing_reservation: true },

      })

    ).toBe(true)

  })



  it("builds billing reservation payment context", () => {

    const context = resolveGroupDealCartContext({

      email: "fan@example.com",

      customer_id: "cus_1",

      metadata: {

        group_deal_billing_reservation: true,

        group_deal_id: "gdeal_1",

        participant_id: "gpart_1",

        billing_customer_key: "customer:cus_1",

      },

      items: [

        {

          metadata: {

            is_group_deal: true,

            group_deal_id: "gdeal_1",

            participant_id: "gpart_1",

          },

        },

      ],

    })



    expect(context).toEqual({

      billing_mode: "reservation",

      customer_key: "customer:cus_1",

      group_deal: {

        id: "gdeal_1",

        participant_id: "gpart_1",

        billing_reservation: true,

      },

    })

  })



  it("extracts billing key data from order payment sessions", () => {

    const billing = extractBillingPaymentFromOrder({

      payment_collections: [

        {

          payment_sessions: [

            {

              id: "payses_1",

              provider_id: "pp_toss-payments_toss-payments",

              data: {

                mode: "billing_reservation",

                status: "billing_reserved",

                billingKey: "billing_test",

                customerKey: "customer:cus_1",

                orderId: "order_test",

              },

            },

          ],

        },

      ],

    })



    expect(billing).toEqual({

      mode: "billing_reservation",

      providerKind: "toss",

      billingKey: "billing_test",

      customerKey: "customer:cus_1",

      orderId: "order_test",

      paymentSessionId: "payses_1",

      providerId: "pp_toss-payments_toss-payments",

    })

  })



  it("extracts stripe setup intent data from order payment sessions", () => {

    const billing = extractBillingPaymentFromOrder({

      payment_collections: [

        {

          payment_sessions: [

            {

              id: "payses_2",

              provider_id: "pp_stripe-group-deal_stripe-group-deal",

              data: {

                mode: "setup_reservation",

                status: "setup_reserved",

                stripeCustomerId: "cus_stripe_1",

                stripePaymentMethodId: "pm_stripe_1",

                orderId: "gdeal_setup_1",

              },

            },

          ],

        },

      ],

    })



    expect(billing).toEqual({

      mode: "setup_reservation",

      providerKind: "stripe",

      stripeCustomerId: "cus_stripe_1",

      stripePaymentMethodId: "pm_stripe_1",

      orderId: "gdeal_setup_1",

      paymentSessionId: "payses_2",

      providerId: "pp_stripe-group-deal_stripe-group-deal",

    })

  })

})



describe("group-deal-payment-provider", () => {

  it("resolves toss for korea and stripe for overseas", () => {

    expect(resolveGroupDealPaymentProviderKind("kr")).toBe("toss")

    expect(resolveGroupDealPaymentProviderKind("us")).toBe("stripe")

    expect(resolveGroupDealPaymentProviderId("kr")).toBe(

      "pp_toss-payments_toss-payments"

    )

    expect(resolveGroupDealPaymentProviderId("us")).toBe(

      "pp_stripe-group-deal_stripe-group-deal"

    )

  })

})


