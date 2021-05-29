import React from 'react'
import { GatsbyImage as Img } from 'gatsby-plugin-image'
import { Container, Flex, Box, css } from 'theme-ui'
import ContentText from '@solid-ui-components/ContentText'
import Reveal from '@solid-ui-components/Reveal'
import ContentContainer from '@solid-ui-components/ContentContainer'
import ContentButtons from '@solid-ui-components/ContentButtons'
import QuickSignupForm from '@solid-ui-components/QuickSignupForm'
import WithDefaultContent from '@solid-ui-blocks/WithDefaultContent'
import getImage from '@solid-ui-components/utils/getImage'

const styles = {
  subTitle: {
    maxWidth: 500
  },
  content: {
    flexDirection: `column`,
    size: `full`,
    alignItems: `center`,
    justifyContent: `center`,
    py: 4
  },
  overlay: {
    size: `full`,
    bg: `omegaDarker`,
    opacity: 0.75,
    position: `absolute`,
    top: 0,
    zIndex: -1
  },
  image: {
    size: `full`,
    position: `absolute`,
    top: 0,
    zIndex: -2
  }
}

const HeroBlock03 = ({
  content: { container, text, buttons, form, images }
}) => (
  <Container variant='full' sx={{ textAlign: `center`, position: `relative` }}>
    <Flex
      sx={{
        ...styles.content,
        minHeight: images?.[0]?.src
          ? getImage(images[0].src)?.height
          : undefined
      }}
    >
      <Reveal effect='fadeInDown'>
        <ContentText
          content={text?.[0]}
          sx={{
            bg: `omegaDarker`,
            display: `inline-block`
          }}
          px='2'
          mb='3'
        />
        <ContentText content={text?.[1]} mb='4' mx='auto' />
        <ContentText content={text?.slice(2)} mx='auto' />
      </Reveal>
      <Box>
        {buttons && (
          <Reveal effect='fadeInUp' duration={0.7}>
            <ContentButtons content={buttons} />
          </Reveal>
        )}
        {form && (
          <Reveal effect='fadeInRight' delay={1}>
            <QuickSignupForm {...form} space={3} />
          </Reveal>
        )}
      </Box>
    </Flex>
    <ContentContainer
      content={container}
      sx={styles.overlay}
      className='block-overlay'
    />
    {images?.[0] && (
      <Box sx={styles.image}>
        <Img
          loading='eager'
          image={getImage(images[0].src)}
          alt={images[0].alt}
          css={css({ size: `full`, verticalAlign: `middle` })}
        />
      </Box>
    )}
  </Container>
)

export default WithDefaultContent(HeroBlock03)
