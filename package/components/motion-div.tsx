import { motion } from 'framer-motion';
import uuid from 'react-uuid';

export const fadeVariants = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
};
export const fadeInTransition = (element: JSX.Element) => {
  const key = uuid();
  return (
    <motion.div
      key={key}
      variants={fadeVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={{ duration: 1.5 }}
    >
      {element}
    </motion.div>
  );
};
