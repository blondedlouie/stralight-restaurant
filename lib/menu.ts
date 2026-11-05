export type MenuVariant = { variant_name: string; price_override: number };

export type MenuProduct = {
  id: string;
  category: string;
  name: string;
  description: string;
  base_price: number;
  kitchen_dept: 'chicken' | 'pizza' | 'drinks' | 'general';
  image: string;
  variants?: MenuVariant[];
};

const sizes = (prices: [number, number, number, number]): MenuVariant[] =>
  ['Regular', 'Medium', 'Large', 'Mega'].map((variant_name, index) => ({ variant_name, price_override: prices[index] }));

const chickenImage = '/2piece.jpg';
const wingsImage = 'https://images.unsplash.com/photo-1527477396000-e27163b481c2?auto=format&fit=crop&w=900&q=82';
const burgerImage = 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=900&q=82';
const pizzaImage = 'https://images.unsplash.com/photo-1571407970349-bc81e7e96d47?auto=format&fit=crop&w=900&q=82';
const shawarmaImage = 'https://images.unsplash.com/photo-1529006557810-274b9b2fc783?auto=format&fit=crop&w=900&q=82';
const chipsImage = 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?auto=format&fit=crop&w=900&q=82';
const drinkImage = 'https://images.unsplash.com/photo-1572490122747-3968b75cc699?auto=format&fit=crop&w=900&q=82';

export const menuProducts: MenuProduct[] = [
  { id: 'chicken-2', category: 'Chicken & Wings', name: '2 Pieces with Chips', description: 'Crispy fried chicken pieces served with chips.', base_price: 400, kitchen_dept: 'chicken', image: '/2piece.jpg' },
  { id: 'chicken-3', category: 'Chicken & Wings', name: '3 Pieces with Chips', description: 'Crispy fried chicken pieces served with chips.', base_price: 500, kitchen_dept: 'chicken', image: '/3piece.jpg' },
  { id: 'chicken-4', category: 'Chicken & Wings', name: '4 Pieces with Chips', description: 'Crispy fried chicken pieces served with chips.', base_price: 650, kitchen_dept: 'chicken', image: '/4piece.jpg' },
  { id: 'chicken-5', category: 'Chicken & Wings', name: '5 Pieces with Chips', description: 'Crispy fried chicken pieces served with chips.', base_price: 750, kitchen_dept: 'chicken', image: '/5piece.jpg' },
  { id: 'chicken-6', category: 'Chicken & Wings', name: '6 Pieces with Chips', description: 'Crispy fried chicken pieces served with chips.', base_price: 900, kitchen_dept: 'chicken', image: '/6piece.jpg' },
  { id: 'chicken-7', category: 'Chicken & Wings', name: '7 Pieces with Chips & Soda', description: 'Seven pieces of fried chicken served with chips and a 1.2L soda.', base_price: 1000, kitchen_dept: 'chicken', image:'/7piece.jpg' },
  { id: 'chicken-bucket-9', category: 'Chicken & Wings', name: '9 Piece Family Bucket', description: 'Chicken, 2 large chips, 4 wings and 2L soda.', base_price: 1800, kitchen_dept: 'chicken', image:'/9piece.jpg' },
  { id: 'chicken-bucket-13', category: 'Chicken & Wings', name: '13 Piece Bucket', description: '13 pieces of chicken, 4 BBQ wings, 2 large chips and a 2L soda.', base_price: 2300, kitchen_dept: 'chicken', image:'/13piece.jpg' },
  { id: 'chicken-bucket-15', category: 'Chicken & Wings', name: '15 Piece Bucket', description: '15 pieces of chicken, 7 BBQ wings, 3 large chips and a 2L soda.', base_price: 3000, kitchen_dept: 'chicken', image: '/15piece.jpg' },
  { id: 'chicken-bucket-21', category: 'Chicken & Wings', name: '21 Piece Bucket', description: '21 pieces of chicken, 7 BBQ wings, 4 large chips and a 2L soda.', base_price: 3800, kitchen_dept: 'chicken', image: '/21piece.jpg' },
  { id: 'chicken-combo-6', category: 'Combos & Offers', name: 'Buy 1 Pizza Get 1 Free ', description: 'Buy 1 Pizza Get 1 Free on Tuesday, Friday, Saturday and Sunday.', base_price: 1000, kitchen_dept: 'pizza', image: '/pizza bgof.jpg' },
  { id: 'wings-5', category: 'Chicken & Wings', name: '5 BBQ Wings Meal', description: '5 pieces of classic fried chicken wings served with chips and a 350ml soda.', base_price: 300, kitchen_dept: 'chicken', image: '/5bbq wings.jpg' },
  { id: 'wings-5-regular', category: 'Chicken & Wings', name: '5 Regular Wings', description: 'Five crispy regular wings.', base_price: 300, kitchen_dept: 'chicken', image: '/5wings.jpg' },
  { id: 'wings-7', category: 'Chicken & Wings', name: '7 Wings Meal', description: '7 pieces of classic fried chicken wings served with chips and a 350ml soda.', base_price: 500, kitchen_dept: 'chicken', image: '/7wings.jpg'},
  { id: 'wings-7-bbq', category: 'Chicken & Wings', name: '7 BBQ Wings', description: 'Seven wings glazed with Starlight BBQ sauce.', base_price: 600, kitchen_dept: 'chicken', image: '/7bbq wings.jpg' },
  { id: 'wings-9', category: 'Chicken & Wings', name: '9 Wings Meal', description: '9 pieces of classic fried chicken wings served with large chips and a 500ml soda.', base_price: 800, kitchen_dept: 'chicken', image: '/9wings.jpg' },
  { id: 'wings-9-bbq', category: 'Chicken & Wings', name: '9 BBQ Wings', description: 'Nine wings glazed with Starlight BBQ sauce.', base_price: 900, kitchen_dept: 'chicken', image: '/9bbq wings.jpg' },
  { id: 'wings-12-classic', category: 'Chicken & Wings', name: '12 Wings Meal', description: '12 pieces of classic fried chicken wings served with large chips and a 1.25L soda.', base_price: 1000, kitchen_dept: 'chicken', image: '/12wings.jpg' },
  { id: 'wings-12-bbq', category: 'Chicken & Wings', name: '12 BBQ Wings, Large Chips & Soda', description: '12 BBQ chicken wings paired with large chips and a 1.25L soda.', base_price: 1100, kitchen_dept: 'chicken', image: '/12wings large.jpg' },
  { id: 'burger-double-classic-meal', category: 'Burgers', name: 'Double Classic (Chips + Soda)', description: 'Double patties for extra satisfaction. Includes chips and a 500ml soda or 300ml juice.', base_price: 650, kitchen_dept: 'chicken', image: '/doubleburger.jpg' },
  { id: 'burger-double-spicy-meal', category: 'Burgers', name: 'Double Spicy (Chips + Soda)', description: 'Double spicy patties with chips and a 500ml soda or 300ml juice.', base_price: 650, kitchen_dept: 'chicken', image: '/doublespicy.jpg' },
  { id: 'burger-meal', category: 'Burgers', name: 'Burger Meal', description: 'Burger served with chips and a 500ml soda or 500ml juice.', base_price: 550, kitchen_dept: 'chicken', image: '/burgermeal.jpg' },
  { id: 'burger-double', category: 'Burgers', name: 'Double Burger', description: 'Double patties for extra satisfaction, available as spicy or classic.', base_price: 550, kitchen_dept: 'chicken', image: '/doubleburger.jpg' },
  { id: 'burger-beef', category: 'Burgers', name: 'Classic Beef Burger', description: 'Delicious burger served with fresh toppings in a soft pan.', base_price: 400, kitchen_dept: 'chicken', image: '/beefburger.jpg'},
  { id: 'burger-chicken', category: 'Burgers', name: 'Classic Chicken Burger', description: 'Delicious chicken patty served with fresh toppings in a soft pan.', base_price: 400, kitchen_dept: 'chicken', image: '/classic chicken.jpg'},
  { id: 'burger-spicy-beef', category: 'Burgers', name: 'Spicy Beef Burger', description: 'Delicious spicy beef patty served with fresh toppings in a soft bun.', base_price: 400, kitchen_dept: 'chicken', image: '/spicybeef.jpg' },
  { id: 'burger-spicy-chicken', category: 'Burgers', name: 'Spicy Chicken Burger', description: 'Delicious spicy chicken patty served with fresh toppings in a soft bun.', base_price: 400, kitchen_dept: 'chicken', image: '/spicychicken.jpg' },
  { id: 'pizza-offer', category: 'Pizza', name: 'Buy 1 Pizza Get 1 Free', description: 'Buy 1 Classic Pizza and get 1 free on Tuesday, Friday, Saturday and Sunday.', base_price: 1000, kitchen_dept: 'pizza', image: '/pizza bgof.jpg', variants: sizes([1000, 1200, 1500, 1800]) },
  { id: 'pizza-hawaiian-chicken', category: 'Pizza', name: 'Chicken Hawaiian Pizza', description: 'Premium chicken pizza with unique toppings.', base_price: 700, kitchen_dept: 'pizza', image: '/chicken hawaiian.jpg', variants: sizes([700, 900, 1100, 1400]) },
  { id: 'pizza-meat-deluxe', category: 'Pizza', name: 'Meat Deluxe Pizza', description: 'A carnivore’s delight with assorted meats.', base_price: 700, kitchen_dept: 'pizza', image: '/meat deluxe.jpg', variants: sizes([700, 900, 1100, 1400]) },
  { id: 'pizza-hawaiian', category: 'Pizza', name: 'Hawaiian Pizza', description: 'A classic mix of chicken, pineapple and mozzarella.', base_price: 600, kitchen_dept: 'pizza', image: '/hawaiian.jpg', variants: sizes([600, 800, 1000, 1300]) },
  { id: 'pizza-bbq-steak', category: 'Pizza', name: 'BBQ Steak Pizza', description: 'Smoky BBQ steak strips, onions and BBQ sauce.', base_price: 600, kitchen_dept: 'pizza', image: '/bbq steak.jpg', variants: sizes([600, 800, 1000, 1300]) },
  { id: 'pizza-chicken-tikka', category: 'Pizza', name: 'Chicken Tikka', description: 'Spiced tikka chicken, onion and capsicum.', base_price: 600, kitchen_dept: 'pizza', image: '/chicken tikka.jpg', variants: sizes([600, 800, 1000, 1300]) },
  { id: 'pizza-veggie-feast', category: 'Pizza', name: 'Veggie Feast Pizza', description: 'A hearty mix of capsicum, mushroom, onion, olives and sweetcorn.', base_price: 600, kitchen_dept: 'pizza', image: '/veggie feast.jpg', variants: sizes([600, 800, 1000, 1300]) },
  { id: 'pizza-chicken-mushroom', category: 'Pizza', name: 'Chicken Mushroom', description: 'Chicken, mushroom, garlic and cream, with rich cheese.', base_price: 600, kitchen_dept: 'pizza', image: '/chicken mushroom.jpg', variants: sizes([600, 800, 1000, 1300]) },
  { id: 'pizza-chicken-bbq', category: 'Pizza', name: 'Chicken BBQ', description: 'Flavour-packed BBQ chicken, red onion and smoky sauce with mozzarella.', base_price: 600, kitchen_dept: 'pizza', image: '/chicken bbq.jpg', variants: sizes([600, 800, 1000, 1300]) },
  { id: 'pizza-periperi', category: 'Pizza', name: 'Periperi Chicken', description: 'Chilli-marinated chicken and mixed peppers.', base_price: 600, kitchen_dept: 'pizza', image: '/periperi chicken.jpg', variants: sizes([600, 800, 1000, 1300]) },
  { id: 'pizza-borewors', category: 'Pizza', name: 'Borewors Pizza', description: 'A meaty delight with rich, flavourful toppings.', base_price: 600, kitchen_dept: 'pizza', image: '/borewore.jpg', variants: sizes([600, 800, 1000, 1300]) },
  { id: 'pizza-veggie-supreme', category: 'Pizza', name: 'Veggie Supreme Pizza', description: 'A hearty mix of veggies for vegetarians.', base_price: 600, kitchen_dept: 'pizza', image: '/veggie supreme.jpg', variants: sizes([600, 800, 1000, 1300]) },
  { id: 'shawarma-chicken-regular', category: 'Shawarma', name: 'Chicken Shawarma (Regular)', description: 'Tender chicken, crisp vegetables and creamy sauce, wrapped fresh.', base_price: 250, kitchen_dept: 'chicken', image: '/shawarma.jpg' },
  { id: 'shawarma-chicken-large', category: 'Shawarma', name: 'Chicken Shawarma (Large)', description: 'A generous chicken shawarma with fresh vegetables and creamy sauce.', base_price: 350, kitchen_dept: 'chicken', image: '/shawarma.jpg' },
  { id: 'chips-regular', category: 'Sides & Drinks', name: 'Chips Regular', description: 'Golden and crispy chips, available in regular or large portions.', base_price: 200, kitchen_dept: 'general', image: '/chips.jpg' },
  { id: 'chips-large', category: 'Sides & Drinks', name: 'Chips Large', description: 'A generous portion of golden crisp potato chips.', base_price: 300, kitchen_dept: 'general', image: '/chips.jpg' },
  { id: 'milkshake', category: 'Sides & Drinks', name: 'Milkshakes', description: 'Fresh flavoured milkshake.', base_price: 200, kitchen_dept: 'drinks', image:'/milkshakes.jpg' , variants: ['Vanilla', 'Chocolate', 'Strawberry', 'Mango'].map((variant_name) => ({ variant_name, price_override: 200 })) },
  { id: 'water-500', category: 'Sides & Drinks', name: '500ml Water', description: 'Water to quench your thirst.', base_price: 100, kitchen_dept: 'drinks', image: '/water.jpg' },
  { id: 'soda-assorted', category: 'Sides & Drinks', name: 'Assorted Sodas', description: 'Refreshing 350ml Coca-Cola Original soft drink.', base_price: 80, kitchen_dept: 'drinks', image: '/sodas.jpg' },
  { id: 'tea-pot-cake', category: 'Sides & Drinks', name: 'Tea Pot + 1 Cake Slice', description: 'A pot of hot tea served with a soft, delicious slice of cake.', base_price: 250, kitchen_dept: 'drinks', image: drinkImage },
  { id: 'chai-dawa-cookie', category: 'Sides & Drinks', name: 'Chai Dawa + 1 Cookie', description: 'Spiced Chai Dawa served hot with a single freshly baked cookie.', base_price: 250, kitchen_dept: 'drinks', image: '/dawa.jpg' },
  { id: 'macchiato-cookie', category: 'Sides & Drinks', name: 'Macchiato + 1 Cookie', description: 'Bold macchiato coffee served with a freshly baked, delicious cookie.', base_price: 250, kitchen_dept: 'drinks', image: drinkImage },
  { id: 'latte-cookie', category: 'Sides & Drinks', name: 'Caramel Latte + 1 Cookie Slice', description: 'Smooth caramel latte served with a freshly baked cookie slice.', base_price: 250, kitchen_dept: 'drinks', image: drinkImage },
  { id: 'malindi-macchiato-cookie', category: 'Sides & Drinks', name: 'Malindi Macchiato + 1 Cookie', description: 'Rich Malindi macchiato served with a freshly baked, tasty cookie.', base_price: 250, kitchen_dept: 'drinks', image: drinkImage },
  { id: 'malindi-chai-latte', category: 'Sides & Drinks', name: 'Malindi Chai Latte + 1 Cookie', description: 'Creamy Malindi chai latte served with a freshly baked, delicious cookie.', base_price: 200, kitchen_dept: 'drinks', image: drinkImage },
  { id: 'flat-white-cookie', category: 'Sides & Drinks', name: 'Flat White + 1 Cookie', description: 'Smooth flat white coffee served with a freshly baked, delicious cookie.', base_price: 200, kitchen_dept: 'drinks', image: drinkImage },
  { id: 'cappuccino-cookie', category: 'Sides & Drinks', name: 'Cappuccino + 1 Cookie', description: 'Cappuccino with rich foam served alongside a freshly baked, tasty cookie.', base_price: 200, kitchen_dept: 'drinks', image: drinkImage },
  { id: 'americano-cookie', category: 'Sides & Drinks', name: 'Americano + 1 Cookie', description: 'Bold Americano coffee served with a freshly baked, crunchy cookie.', base_price: 180, kitchen_dept: 'drinks', image: drinkImage },
  { id: 'tea-cake', category: 'Sides & Drinks', name: 'Tea + 1 Cake Slice', description: 'Hot, refreshing tea served with a soft, delicious slice of cake.', base_price: 150, kitchen_dept: 'drinks', image: drinkImage },
  { id: 'ice-cream', category: 'Sides & Drinks', name: 'Ice Cream', description: 'A cool scoop of ice cream.', base_price: 100, kitchen_dept: 'drinks', image: drinkImage },
];
