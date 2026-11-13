-- Sample catalogue (public-domain classics; descriptions are original). Idempotent.

INSERT INTO categories (slug, name) VALUES
  ('fiction', 'Fiction'),
  ('science-fiction', 'Science Fiction'),
  ('mystery', 'Mystery'),
  ('non-fiction', 'Non-Fiction')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO books (slug, title, author, description, category_id, price_cents, pages, published_year, isbn, cover_color)
SELECT v.slug, v.title, v.author, v.description, c.id, v.price_cents, v.pages, v.published_year, v.isbn, v.cover_color
FROM (VALUES
  ('pride-and-prejudice', 'Pride and Prejudice', 'Jane Austen',
   'A sharp-witted comedy of manners following Elizabeth Bennet as she navigates family pressure, first impressions and the proud Mr. Darcy.',
   'fiction', 699, 432, 1813, '9780141439518', '#8c3b5b'),
  ('great-expectations', 'Great Expectations', 'Charles Dickens',
   'Orphaned Pip is handed a mysterious fortune and learns what it costs to chase status over the people who love him.',
   'fiction', 799, 544, 1861, '9780141439563', '#5b3b8c'),
  ('jane-eyre', 'Jane Eyre', 'Charlotte Bronte',
   'An independent governess finds love and a dark secret at Thornfield Hall in this landmark gothic romance.',
   'fiction', 749, 532, 1847, '9780141441146', '#3b8c6b'),
  ('the-time-machine', 'The Time Machine', 'H. G. Wells',
   'A Victorian inventor travels to the year 802,701 and finds a future that is far stranger than progress promised.',
   'science-fiction', 499, 118, 1895, '9780141439976', '#3b5b8c'),
  ('frankenstein', 'Frankenstein', 'Mary Shelley',
   'A young scientist builds life from lifeless matter and then abandons it, in the novel that launched modern science fiction.',
   'science-fiction', 599, 280, 1818, '9780141439471', '#4a6b3b'),
  ('the-war-of-the-worlds', 'The War of the Worlds', 'H. G. Wells',
   'Martian cylinders fall on southern England and a narrator watches civilisation crumble beneath tripod war machines.',
   'science-fiction', 549, 192, 1898, '9780141441030', '#8c4a3b'),
  ('twenty-thousand-leagues-under-the-sea', 'Twenty Thousand Leagues Under the Sea', 'Jules Verne',
   'Professor Aronnax joins the enigmatic Captain Nemo aboard the Nautilus for a voyage through the ocean depths.',
   'science-fiction', 649, 448, 1870, '9780140621624', '#1f6f8b'),
  ('the-adventures-of-sherlock-holmes', 'The Adventures of Sherlock Holmes', 'Arthur Conan Doyle',
   'Twelve classic cases in which the great detective reads clues no one else notices.',
   'mystery', 649, 307, 1892, '9780140437713', '#6b5b3b'),
  ('the-hound-of-the-baskervilles', 'The Hound of the Baskervilles', 'Arthur Conan Doyle',
   'A spectral hound haunts the Devon moors and Holmes must separate legend from a very human crime.',
   'mystery', 599, 256, 1902, '9780141034362', '#2f4f4f'),
  ('the-moonstone', 'The Moonstone', 'Wilkie Collins',
   'A cursed Indian diamond vanishes from an English country house in one of the first detective novels.',
   'mystery', 699, 528, 1868, '9780140434088', '#7a3b8c'),
  ('walden', 'Walden', 'Henry David Thoreau',
   'Two years beside a Massachusetts pond become a meditation on simple living, self-reliance and attention.',
   'non-fiction', 549, 352, 1854, '9780143039822', '#3b7a4a'),
  ('the-art-of-war', 'The Art of War', 'Sun Tzu',
   'Ancient Chinese strategy distilled into short, quotable lessons about conflict, preparation and winning without fighting.',
   'non-fiction', 399, 112, NULL, '9781599869773', '#8c6b3b')
) AS v(slug, title, author, description, category_slug, price_cents, pages, published_year, isbn, cover_color)
JOIN categories c ON c.slug = v.category_slug
ON CONFLICT (slug) DO NOTHING;
