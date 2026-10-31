'use client'

import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Menu, Search, ShoppingBag, UserRound, X } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import styles from './Header.module.css'

type HeaderProps = {
  isAdmin?: boolean
}

const links = [
  { href: '/', label: 'Accueil' },
  { href: '/shop', label: 'Boutique' },
  { href: '/coffrets', label: 'Coffrets' },
  { href: '/personnalisation', label: 'Personnalisation' },
  { href: '/a-propos', label: 'À propos' },
  { href: '/contact', label: 'Contact' },
]

export default function Header({ isAdmin = false }: HeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const pathname = usePathname()
  const menuButtonRef = useRef<HTMLButtonElement>(null)
  const firstLinkRef = useRef<HTMLAnchorElement>(null)

  const closeMenu = useCallback((restoreFocus = false) => {
    setMenuOpen(false)
    if (restoreFocus) requestAnimationFrame(() => menuButtonRef.current?.focus())
  }, [])

  useEffect(() => {
    if (menuOpen) firstLinkRef.current?.focus()
  }, [menuOpen])

  useEffect(() => {
    closeMenu()
  }, [pathname, closeMenu])

  useEffect(() => {
    if (!menuOpen) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeMenu(true)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [menuOpen, closeMenu])

  const allLinks: { href: string; label: string; icon?: ReactNode }[] = [
    ...links,
    { href: '/shop', label: 'Rechercher', icon: <Search aria-hidden="true" size={17} /> },
    { href: '/compte', label: 'Compte', icon: <UserRound aria-hidden="true" size={17} /> },
    { href: '/panier', label: 'Panier', icon: <ShoppingBag aria-hidden="true" size={17} /> },
    ...(isAdmin ? [{ href: '/admin', label: 'Administration' }] : []),
  ]

  return (
    <header className={styles.header}>
      <div className={styles.bar}>
        <Link href="/" className={styles.logoLink} aria-label="Luna Baby Créations — accueil">
          <Image
            src="/logo.png"
            alt="Logo Luna Baby Creations, ourson sur un croissant de lune"
            width={56}
            height={56}
            priority
            className={styles.logo}
          />
        </Link>

        <Link href="/" className={styles.brand} aria-label="Luna Baby Créations — accueil">
          <span className={styles.brandName}>Luna Baby Creations</span>
          <span className={styles.brandSub}>Créations faites avec douceur</span>
        </Link>

        <nav className={styles.desktopNav} aria-label="Navigation principale">
          {links.map(({ href, label }) => (
            <Link className={styles.navLink} href={href} key={href}>
              {label}
            </Link>
          ))}
          <Link className={styles.iconLink} href="/shop" aria-label="Rechercher dans la boutique">
            <Search size={18} aria-hidden="true" />
          </Link>
          <Link className={styles.iconLink} href="/compte" aria-label="Compte">
            <UserRound size={18} aria-hidden="true" />
          </Link>
          <Link className={styles.iconLink} href="/panier" aria-label="Panier">
            <ShoppingBag size={18} aria-hidden="true" />
          </Link>
          {isAdmin && <Link className={styles.navLink} href="/admin">Admin</Link>}
        </nav>

        <button
          ref={menuButtonRef}
          type="button"
          className={styles.menuButton}
          aria-label={menuOpen ? 'Fermer le menu' : 'Ouvrir le menu'}
          aria-expanded={menuOpen}
          aria-controls="luna-mobile-navigation"
          onClick={() => setMenuOpen((open) => !open)}
        >
          <span className={`${styles.menuGlyph} ${menuOpen ? styles.menuGlyphOpen : ''}`} aria-hidden="true">
            {menuOpen ? <X size={23} /> : <Menu size={23} />}
          </span>
        </button>
      </div>

      <div
        className={`${styles.mobileLayer} ${menuOpen ? styles.mobileLayerOpen : ''}`}
        aria-hidden={!menuOpen}
        onMouseDown={(event) => {
          if (event.target === event.currentTarget) closeMenu()
        }}
      >
        <nav
          id="luna-mobile-navigation"
          className={styles.mobilePanel}
          aria-label="Navigation principale"
          aria-hidden={!menuOpen}
          inert={!menuOpen}
        >
          <div className={styles.panelHeading}>
            <span>Explorer</span>
            <span className={styles.panelRule} />
          </div>
          {allLinks.map(({ href, label, icon }, index) => (
            <Link
              ref={index === 0 ? firstLinkRef : undefined}
              href={href}
              key={href}
              className={styles.mobileLink}
              onClick={() => closeMenu()}
            >
              <span>{label}</span>
              {icon ?? <span className={styles.linkArrow} aria-hidden="true">↗</span>}
            </Link>
          ))}
          <p className={styles.panelNote}>Des créations uniques, imaginées avec amour.</p>
        </nav>
      </div>
    </header>
  )
}
