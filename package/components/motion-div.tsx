import { motion } from 'framer-motion';

export const fadeVariants = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
};
export const fadeInTransition = (element: JSX.Element, key: string) => {
  return (
    <motion.div
      key={key}
      variants={fadeVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={{ duration: 1 }}
    >
      {element}
    </motion.div>
  );
};

export const slideUpVariants = {
  initial: { y: 10, opacity: 0 },
  animate: { y: 0, opacity: 1 },
  exit: { y: -10, opacity: 0 },
};

export const slideUpTransition = (element: JSX.Element, key: string) => {
  return (
    <motion.div
      key={key}
      variants={slideUpVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={{ duration: 0.2 }}
    >
      {element}
    </motion.div>
  );
};
