import React from 'react'
import { GatsbyImage as Img } from 'gatsby-plugin-image'
import { Container, Flex, Box, css } from 'theme-ui'
import Reveal from '@solid-ui-components/Reveal'
import Divider from '@solid-ui-components/Divider'
import { ImQuotesRight } from 'react-icons/im'
import { AiFillStar } from 'react-icons/ai'
import ContentText from '@solid-ui-components/ContentText'
import ContentContainer from '@solid-ui-components/ContentContainer'
import WithDefaultContent from '@solid-ui-blocks/WithDefaultContent'
import getImage from '@solid-ui-components/utils/getImage'

const styles = {
  avatar: {
    width: 150,
    bg: `omegaLighter`,
    borderTopColor: `omegaLighter`,
    borderTopWidth: `xl`,
    borderTopStyle: `solid`,
    borderRadius: `lg`,
    boxSizing: `content-box`
  }
}

const TestimonialsBlock02 = ({ content: { text, collection } }) => (
  <Container>
    <Box sx={{ textAlign: `center` }}>
      <ContentText content={text} />
    </Box>
    <Divider />
    <Flex sx={{ mx: -3, flexWrap: `wrap` }}>
      {collection?.map(({ container, avatar, text }, index) => (
        <Box
          key={`item-${index}`}
          sx={{ flexBasis: [`1`, `1/2`], flexGrow: 1, p: 3 }}
        >
          <Reveal effect='fadeInLeft' delay={0.25 * (index + 2)}>
            <Flex
              sx={{
                alignItems: `center`,
                flexDirection: [`column`, null, null, `row`]
              }}
            >
              <ContentContainer
                content={container}
                variant='cards.paper'
                sx={{
                  flexBasis: `1/3`,
                  textAlign: `center`,
                  position: `relative`,
                  width: `full`
                }}
              >
                <ImQuotesRight
                  css={css({
                    size: `icon.lg`,
                    color: `omegaLighter`,
                    position: `absolute`,
                    bottom: `-12%`,
                    left: `50%`,
                    transform: `translate(-50%, 0)`
                  })}
                />
                <ContentText content={text?.slice(0, 2)} />
                <Box mt='3'>
                  {Array.from({ length: 5 }, (_, i) => (
                    <AiFillStar
                      key={`item-${i}`}
                      css={css({ color: `alphaLight` })}
                    />
                  ))}
                </Box>
              </ContentContainer>
              <Box
                sx={{
                  ml: [0, null, null, -3],
                  mr: [0, null, null, 3],
                  mt: [-4, null, null, 0],
                  mb: [3, null, null, 0]
                }}
              >
                <Img
                  image={getImage(avatar?.src)}
                  alt={avatar?.alt}
                  css={css(styles.avatar)}
                />
              </Box>
              <Box sx={{ flexBasis: `1/3`, flexGrow: 1 }}>
                <ContentText content={text?.slice(2)} />
              </Box>
            </Flex>
          </Reveal>
        </Box>
      ))}
    </Flex>
  </Container>
)

export default WithDefaultContent(TestimonialsBlock02)
