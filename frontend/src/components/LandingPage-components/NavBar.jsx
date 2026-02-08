import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import styled from 'styled-components';
import logo from '../../Images/Logo.png';

const DARK_BLUE = '#4F46E5';
const WHITE = '#FFFFFF';

const NavContainer = styled.nav`
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 80px;
  z-index: 1000;

  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0px 50px 0px 0px;
  box-sizing: border-box;

  background-color: ${({ $isScrolled }) =>
    $isScrolled ? WHITE : 'transparent'};

  color: ${({ $isScrolled }) =>
    $isScrolled ? DARK_BLUE : WHITE};

  box-shadow: ${({ $isScrolled }) =>
    $isScrolled ? '0 4px 12px rgba(0,0,0,0.1)' : 'none'};

  transition:
    background-color 0.3s ease,
    color 0.3s ease,
    box-shadow 0.3s ease;
`;

const Logo = styled.img`
  width: 200px;
`;

const NavLinks = styled.ul`
  display: flex;
  gap: 30px;
  list-style: none;
  margin: 0;
  padding: 0;


`;

const NavItem = styled.li`
  font-weight: 500;

  a {
    color: inherit;
    text-decoration: none;
    transition: opacity 0.2s ease;
  }

  a:hover {
    opacity: 0.7;
  }
`;

const ActionButton = styled(Link)`
  padding: 10px 20px;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  text-decoration: none;

  background-color: ${({ $isScrolled }) =>
    $isScrolled ? DARK_BLUE : 'transparent'};

  color: ${({ $isScrolled }) =>
    $isScrolled ? WHITE : WHITE};

  border: 2px solid
    ${({ $isScrolled }) =>
    $isScrolled ? DARK_BLUE : WHITE};

  transition:
    background-color 0.3s ease,
    color 0.3s ease,
    border-color 0.3s ease;

  &:hover {
    background-color: ${({ $isScrolled }) =>
    $isScrolled ? '#3f38bc' : WHITE};
    color: ${({ $isScrolled }) =>
    $isScrolled ? WHITE : DARK_BLUE};
  }
`;


const NavBar = () => {
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 80);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <NavContainer $isScrolled={isScrolled}>
      <Logo src={logo} alt="Brand Logo" />

      <NavLinks>
        <NavItem><a href="#home">Home</a></NavItem>
        <NavItem><Link to="/servers">Community</Link></NavItem>
      </NavLinks>

      <ActionButton to="/auth" $isScrolled={isScrolled}>
        Get Started
      </ActionButton>
    </NavContainer>
  );
};

export default NavBar;

