export const fetchProductQuery = `#graphql
  query getProductById($id: ID! ) {
    product(id: $id) {
        id
        title
        featuredImage {
            url
            altText
        }
    }
  }
`
