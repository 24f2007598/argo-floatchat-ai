import { useState, useEffect, useRef } from "react";
import { VStack, Box, Flex, Textarea, Button, Spinner, Center, Heading } from "@chakra-ui/react";
import axios from "axios";
import { motion } from "framer-motion";
export default function Chat({ messages, setMessages, records, setRecords, waiting, setWaiting, setTabIndex }) {

  const [input, setInput] = useState("");
  const [firstQuery, setFirstQuery] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, waiting]);

  const sendMessage = async () => {
    if (!input.trim()) return;
    if (!firstQuery) setFirstQuery(true);

    const newMsg = { role: "user", content: input };
    setMessages([...messages, newMsg]);
    setInput("");
    setWaiting(true);

    try {
      const res = await axios.post("http://127.0.0.1:8000/query", { query: input });
      const answer = res.data.answer || "⚠ No answer received.";
      setMessages(prev => [...prev, { role: "assistant", content: answer }]);
      if (res.data.records) setRecords(res.data.records);
    } catch (e) {
      setMessages(prev => [...prev, { role: "assistant", content: `Failed to connect: ${e}` }]);
    } finally {
      setWaiting(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <VStack align="center" spacing={6} w="100%" pt={10}>
      <Heading
        size={firstQuery ? "lg" : "2xl"}
        mb={4}
        transition="all 0.5s ease-in-out"
        color="cyan.200"
      >
        {firstQuery ? "🌊 FloatChat" : "FloatChat - Question the Ocean!"}
      </Heading>

      <Box
        w="60vw"
        h="70vh"
        bg="rgba(2, 19, 59, 1)"
        borderRadius="2xl"
        display="flex"
        flexDirection="column"
        justifyContent="space-between"
        overflow="hidden"
        boxShadow="xl"
      >
        {/* Messages */}
        <Box
          px={4}
          py={3}
          overflowY="auto"
          flex="1"
          display="flex"
          flexDirection="column"
          gap={3}
          // 👇 Custom Scrollbar Styles
          sx={{
            // For Firefox
            scrollbarColor: "rgba(37, 60, 144, 0.44) transparent",
            scrollbarWidth: "thin",
            
            // For Webkit (Chrome, Safari, Edge)
            "&::-webkit-scrollbar": {
              width: "8px", // Make it thin
            },
            "&::-webkit-scrollbar-track": {
              bg: "transparent", // Invisible track
            },
            "&::-webkit-scrollbar-thumb": {
              bg: "rgba(9, 5, 55, 1)", // Discrete dark/transparent thumb
              borderRadius: "full",
            },
            "&::-webkit-scrollbar-thumb:hover": {
              bg: "rgba(25, 6, 76, 0.37)", // Slightly visible on hover
            },
          }}
        >
          {messages.map((msg, i) => (
            <Flex key={i} justify={msg.role === "user" ? "flex-end" : "flex-start"}>
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: i * 0.05 }}
                style={{ display: "block", width: "fit-content", maxWidth: "75%" }}
                >
                <Box
                    bg={msg.role === "user" ? "#0051a2" : "rgba(3, 6, 33, 0.13)"}
                    color="white"
                    px={4}
                    py={2}
                    borderRadius="3xl"
                    width="100%"
                    whiteSpace="pre-wrap"
                >
                  {msg.content}
                </Box>
              </motion.div>
            </Flex>
          ))}

          {waiting && (
            <Center mt={2}>
              <Spinner size="sm" color="white" />
            </Center>
          )}

          <div ref={messagesEndRef} />
        </Box>

<Flex
  px={4}
  py={3}
  borderTop="1px solid"
  borderColor="gray.700"
  flexShrink={0}
  gap={4}
>
  {/* Textarea on the left */}
  <Textarea
    value={input}
    onChange={(e) => setInput(e.target.value)}
    onKeyDown={handleKeyDown}
    placeholder="Type your question..."
    size="md"
    resize="none"
    color="white"
    bg="#1e3f6cff"
    _placeholder={{ color: "gray.400" }}
    flex="1"
  />

  {/* Right-side buttons */}
  <Flex direction="column" align="center" gap={2} minW="140px">
    <Button
      colorScheme="blue"
      onClick={sendMessage}
      isDisabled={waiting}
      width="100%"
    >
      Send
    </Button>
    <Button
  bg="#17a2d1ff"          // Custom blue background
  color="white"         // Text color
  onClick={() => setTabIndex(2)}
  width="100%"
  _hover={{
    bg: "#1b83a0ff",      // Lighter blue on hover
    color: "white", 
    transition: "all 0.2s ease-in-out"
  }}
>
  Go to Visualization
</Button>

  </Flex>
</Flex>

      </Box>
    </VStack>
  );
}