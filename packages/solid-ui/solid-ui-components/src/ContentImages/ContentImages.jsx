import React from 'react'
import { GatsbyImage as Img } from 'gatsby-plugin-image'
import { css } from 'theme-ui'
import Reveal from '@solid-ui-components/Reveal'
import getImage from '@solid-ui-components/utils/getImage'

const ContentImages = ({
  content: { images },
  reverse,
  imagePosition,
  imageFit,
  imageEffect,
  loading
}) =>
  images ? (
    <>
      <Reveal
        effect={imageEffect || (reverse ? 'fadeInRight' : 'fadeInLeft')}
        css={css({
          textAlign:
            imagePosition === 'center' ? 'center' : reverse ? `right` : `left`
        })}
      >
        {images?.[0]?.src && (
          <Img
            image={getImage(images[0].src)}
            alt={images[0].alt}
            loading={loading}
            objectFit={imageFit}
            css={css({
              verticalAlign: `middle`,
              borderStyle: images[0].border ? `solid` : `none`,
              borderWidth: images[0].border || 0,
              borderColor: `white`,
              boxShadow: images[0].shadow || `unset`,
              borderRadius: images[0].radius || `unset`
            })}
          />
        )}
      </Reveal>
      {images?.slice(1)?.map(
        (
          { src, position = {}, effects = [], radius, shadow, border, alt },
          index
        ) =>
          src && (
            <Reveal
              key={`item-${index}`}
              effect={effects[0] || undefined}
              delay={0.5}
              css={css({
                ...position,
                position: `absolute`,
                display: [`none`, `block`]
              })}
            >
              <Reveal
                effect={effects[1] || undefined}
                style={{ backfaceVisibility: `hidden` }}
              >
                <Img
                  image={getImage(src)}
                  alt={alt}
                  css={css({
                    borderStyle: border ? `solid` : `none`,
                    borderWidth: border || 0,
                    borderColor: `white`,
                    boxShadow: shadow || `unset`,
                    borderRadius: radius || `unset`
                  })}
                />
              </Reveal>
            </Reveal>
          )
      )}
    </>
  ) : null

ContentImages.defaultProps = {
  loading: 'lazy'
}

export default ContentImages
