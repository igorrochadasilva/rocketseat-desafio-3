import { createContext, ReactNode, useContext, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {

  const [cart, setCart] = useState<Product[]>(() => {
  
   const storagedCart = localStorage.getItem('@RocketShoes:cart')

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });
  
  const getStock = async (productId: number): Promise<Stock> => { 
    const response = await api.get(`/stock/${productId}`);
    const {data} = response
    return data
  }
  
  const setLocalStorageItem = (cart: Product[]) => {    
    localStorage.setItem('@RocketShoes:cart', JSON.stringify(cart))
  }

  const addProduct = async (productId: number) => {
    try {          
      
      const updateCart = [...cart]
      const productExists = updateCart.find(product => product.id === productId)
      
      const stock = await getStock(productId)      
      const stockAmount = stock.amount
      
      const currentAmount = productExists ? productExists.amount : 0
      const amount = currentAmount + 1
      
          
      if(amount > stockAmount){
        toast.error('Quantidade solicitada fora de estoque')
        return;
      }
      
      if(productExists){
        productExists.amount = amount;
      } else {
        const product = await api.get(`/products/${productId}`)
        
        const newProduct = {
          ...product.data,
          amount: 1          
        }
        
        updateCart.push(newProduct)
      }
      
      setCart(updateCart)
      setLocalStorageItem(updateCart)
                                                
    } catch {   
      toast.error('Erro na adição do produto');    
    }
  };

  const removeProduct = (productId: number) => {
    try {
    
      const productExists = cart.some(product => product.id === productId)
      
      if(productExists){
        const newCart = cart.filter(product => product.id !== productId)
        setCart(newCart)
        setLocalStorageItem(newCart)
      } else {
        throw new Error('Produto não existe');
      }
      
    } catch {     
      toast.error('Erro na remoção do produto');
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    
    try {
      
      //new cart with new product amount
      const newCart = cart.map(product => {        
        return  product.id === productId 
          ? {...product, amount}
          : product      
      })    
      
      // check if product amount is less or equal to zero
      const checkProductIsLess = cart.some(product => productId === product.id && amount <= 0)                    
      
      const productStock = await getStock(productId)      
      
      const productHasStock = newCart.some(product => product.id === productId && product.amount > productStock.amount)
      
      if(!checkProductIsLess && !productHasStock){
        newCart && setCart(newCart)
        newCart && setLocalStorageItem(newCart)
      } else if(productHasStock) {        
        toast.error('Quantidade solicitada fora de estoque');
      } 
     
    } catch {      
      toast.error('Erro na alteração de quantidade do produto');
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
