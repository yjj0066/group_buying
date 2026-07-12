import PublishedProductsGrid from "@modules/products/templates/published-products-grid"

import { getServerDictionary } from "@i18n/server"



type GroupDealsListTemplateProps = {

  countryCode: string

}



const GroupDealsListTemplate = async ({

  countryCode,

}: GroupDealsListTemplateProps) => {

  const dictionary = await getServerDictionary()



  return (

    <PublishedProductsGrid

      countryCode={countryCode}

      title={dictionary.groupBuying.title}

      description={dictionary.products.groupBuyingDescription}

      emptyMessage={dictionary.products.empty}

      regionErrorMessage={dictionary.products.regionError}

    />

  )

}



export default GroupDealsListTemplate

