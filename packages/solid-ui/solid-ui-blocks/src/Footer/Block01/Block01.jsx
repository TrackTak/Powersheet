import React from 'react'
import { Link as GLink } from 'gatsby'
import { GatsbyImage as Img } from 'gatsby-plugin-image'
import { Container, Box, Flex } from 'theme-ui'
import ContentText from '@solid-ui-components/ContentText'
import PoweredByGatsby from '@solid-ui-components/PoweredByGatsby'
import ContentButtons from '@solid-ui-components/ContentButtons'
import WithDefaultContent from '@solid-ui-blocks/WithDefaultContent'
import getImage from '@solid-ui-components/utils/getImage'

const styles = {
  wrapper: {
    position: `relative`,
    bg: `footerBg`
  },
  footer: {
    flexDirection: [`column-reverse`, `row`],
    justifyContent: `space-between`,
    alignItems: [`center`, `flex-start`],
    py: 5
  }
}

const FooterBlock01 = ({ content: { images, collection } }) => {
  return (
    <Box sx={styles.wrapper}>
      <Container px='4'>
        <Flex sx={styles.footer}>
          <Box sx={{ minWidth: 200 }}>
            <Box pb='1' mb='2' mt={[4, 0]}>
              <GLink to='/'>
                <Img
                  image={getImage(images?.[0]?.src)}
                  alt={images?.[0]?.alt}
                />
              </GLink>
            </Box>
            <Box pt='2' mb={[2, 4]}>
              © {new Date().getFullYear()}, All Rights Reserved.
            </Box>
            <Box>
              <PoweredByGatsby />
            </Box>
          </Box>
          {collection?.map(
            ({ text, buttons }, index) =>
              buttons && (
                <Box key={`item-${index}`} mb='3'>
                  <ContentText
                    content={text?.[0]}
                    variant='h5'
                    sx={{ display: [`none`, `block`] }}
                  />
                  <ContentButtons
                    content={buttons}
                    variant='vertical'
                    wrapperStyles={{ flexDirection: [null, `column`] }}
                  />
                </Box>
              )
          )}
        </Flex>
      </Container>
    </Box>
  )
}

FooterBlock01.defaultProps = {
  menuJustify: `flex-end`
}

export default WithDefaultContent(FooterBlock01)
