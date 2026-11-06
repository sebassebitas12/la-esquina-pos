import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon } from './Icon.jsx';
import { resources } from '../data/resources.js';

const destinations = [
  { key: 'home', title: 'Pendientes del día', group: 'Operación', route: '/' },
  ...resources.map((resource) => ({ key: resource.key, title: resource.title, group: resource.group, route: `/${resource.route}` }))
];

export default function CommandSearch() {
  const navigate = useNavigate();
  const inputRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);

  const results = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase('es-CR');
    const found = needle ? destinations.filter((item) => `${item.title} ${item.group}`.toLocaleLowerCase('es-CR').includes(needle)) : destinations;
    return found.slice(0, 8);
  }, [query]);

  useEffect(() => {
    function openWithShortcut(event) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setOpen(true);
      }
    }
    window.addEventListener('keydown', openWithShortcut);
    return () => window.removeEventListener('keydown', openWithShortcut);
  }, []);

  useEffect(() => {
    if (open) window.requestAnimationFrame(() => inputRef.current?.focus());
    else {
      setQuery('');
      setActiveIndex(0);
    }
  }, [open]);

  function choose(route) {
    setOpen(false);
    navigate(route);
  }

  function handleKeys(event) {
    if (event.key === 'Escape') {
      event.preventDefault();
      setOpen(false);
    } else if (event.key === 'ArrowDown' && results.length) {
      event.preventDefault();
      setActiveIndex((index) => (index + 1) % results.length);
    } else if (event.key === 'ArrowUp' && results.length) {
      event.preventDefault();
      setActiveIndex((index) => (index - 1 + results.length) % results.length);
    } else if (event.key === 'Enter' && results[activeIndex]) {
      event.preventDefault();
      choose(results[activeIndex].route);
    }
  }

  return <>
    <button className="command-trigger" type="button" onClick={() => setOpen(true)} aria-label="Buscar módulos o listas con Ctrl K" aria-haspopup="dialog">
      <Icon name="search" size={17} />
      <span>Buscar en la tienda</span>
      <kbd>Ctrl K</kbd>
    </button>
    {open && <div className="command-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setOpen(false); }}>
      <section className="command-palette" role="dialog" aria-modal="true" aria-labelledby="command-title">
        <h2 className="visually-hidden" id="command-title">Buscar una sección</h2>
        <div className="command-input-wrap"><Icon name="search" size={19} /><input ref={inputRef} type="search" value={query} onChange={(event) => { setQuery(event.target.value); setActiveIndex(0); }} onKeyDown={handleKeys} placeholder="Buscá un módulo o una lista…" aria-label="Buscar un módulo o una lista" /><kbd>ESC</kbd></div>
        <ul className="command-results" role="listbox" aria-label="Secciones disponibles">
          {results.map((item, index) => <li key={item.key}>
            <button type="button" className={index === activeIndex ? 'command-result command-result--active' : 'command-result'} role="option" aria-selected={index === activeIndex} onMouseEnter={() => setActiveIndex(index)} onClick={() => choose(item.route)}>
              <span className="command-result-title">{item.title}</span><span className="command-result-group">{item.group}</span><Icon name="arrow" size={16} />
            </button>
          </li>)}
          {results.length === 0 && <li className="command-no-results">No hay secciones con ese nombre.</li>}
        </ul>
        <p className="command-help">Usá ↑ y ↓ para moverte. Enter abre la sección.</p>
      </section>
    </div>}
  </>;
}
