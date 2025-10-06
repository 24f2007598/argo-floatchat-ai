import { useEffect } from "react";
import { Box, VStack, Heading, Text } from "@chakra-ui/react";
import { motion, useAnimation } from "framer-motion";

const MotionHeading = motion(Heading);
const MotionText = motion(Text);
const MotionButton = motion(Box); // We'll use Chakra Box as button container

export default function Home({ setTabIndex }) {
  const headingControls = useAnimation();
  const textControls = useAnimation();
  const buttonControls = useAnimation();

  useEffect(() => {
    // Reset animations every time this component mounts
    headingControls.set({ y: 50, opacity: 0 });
    textControls.set({ opacity: 0, y: 0 });
    buttonControls.set({ opacity: 0, y: 20 });

    // Animate
    headingControls.start({ y: 0, opacity: 1, transition: { duration: 0.8 } });
    textControls.start({ opacity: 1, transition: { duration: 0.8, delay: 0.5 } });
    buttonControls.start({ opacity: 1, y: 0, transition: { duration: 0.5, delay: 1 } });
  }, [headingControls, textControls, buttonControls]);

  return (
    <Box
      w="100%"
      h="100%"
      display="flex"
      justifyContent="center"
      alignItems="center"
    >
      <VStack spacing={6}>
        <MotionHeading
          size="2xl"
          color="cyan.200"
          initial={{ y: 50, opacity: 0 }}
          animate={headingControls}
        >
          🌊 Welcome to FloatChat
        </MotionHeading>
        <MotionText
          fontSize="lg"
          color="whiteAlpha.800"
          initial={{ opacity: 0 }}
          animate={textControls}
        >
          Your ocean data companion. Explore the ocean with ease and discover what’s beneath the surface.
        </MotionText>
        <MotionButton
          as="button"
          bg="#1f6bc8ff"
          color="white"
          fontWeight="bold"
          px={8}
          py={4}
          borderRadius="lg"
          cursor="pointer"
          _hover={{
            bg: "#1157b3ff",
            transform: "scale(1.05)",
            transition: "all 0.2s ease-in-out",
          }}
          initial={{ y: 20, opacity: 0 }}
          animate={buttonControls}
          onClick={() => setTabIndex(1)} // Switch to Chat tab
        >
          Start Now
        </MotionButton>
      </VStack>
    </Box>
  );
}