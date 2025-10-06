import { useState } from "react";
import { 
  ChakraProvider, 
  Tabs, 
  TabList, 
  TabPanels, 
  Tab, 
  TabPanel, 
  Box, 
  Flex,
} from "@chakra-ui/react";
// Assuming these components are available in the scope
import Chat from "./components/Chat";
import Home from "./components/Home";
import Visualization from "./components/Visualization"; 

// Custom Tab component to handle the pipe separator logic
function TabWithSeparator({ label, needsSeparator = false, ...props }) {
    // Pipe separator style: positioned after the tab
    const separatorStyle = needsSeparator 
        ? {
            content: '""',
            display: "block",
            width: "1px",
            height: "60%",
            bg: "gray.500", // Color of the pipe
            position: "absolute",
            right: "0",
            top: "20%",
            transform: "translateX(50%)", // Visually centers the line between tabs
          }
        : {};

    return (
        <Tab 
            {...props} 
            flex="1" // Ensures equal width for all tabs in their group
            position="relative" // Required for absolute positioning of the separator
            sx={{
                '&::after': separatorStyle
            }}
        >
            {label}
        </Tab>
    );
}

function App() {
  const [messages, setMessages] = useState([]);
  // making changes 
  // old code : const [records, setRecords] = useState([]); only
  const [records, setRecords] = useState([]);
  const [waiting, setWaiting] = useState(false);
  const [relevantProfileIds, setRelevantProfileIds] = useState([]);
  
  // ✨ NEW: State to control the active tab index. Starting on 'Chat' (index 1).
  // Tabs: Home (0), Chat (1), Visualization (2), About (3), Login/Signup (4)
  const [tabIndex, setTabIndex] = useState(0); 

  // --- Custom Tab Styles ---
  const tabStyle = {
    color: "blue.200",
    fontWeight: "bold",
    fontFamily: "Roboto Mono, monospace",
    
    _hover: {
      bg: "#124d79ff",
      color: "cyan.100",
      transform: "scale(1.03)",
      transition: "all 0.2s ease-in-out",
      boxShadow: "lg",
    },

    _selected: {
      color: "white",
      bg: "#2b72a8ff",
      boxShadow: "xl",
    },
    
    px: 4, 
    borderRadius: "lg",
    margin: "0 1px", 
  };
  // -------------------------

  return (
    <ChakraProvider>
      <Box
        w="100vw"
        h="100vh"
        bgGradient="linear(to-b, #001528ff, #01445cff, #38eee2ff)"
        position="relative"
        overflow="hidden"
      >
        {/* Control the active tab using state (tabIndex) */}
        <Tabs 
          variant="soft-rounded" 
          colorScheme="blue" 
          h="100%"
          index={tabIndex} // Controlled index
          onChange={setTabIndex} // Setter for when a tab is clicked
        > 
          <TabList 
            p={2}
            bg="rgba(0, 0, 0, 0.2)"
            borderRadius="xl"
            mx={4}
            display="flex"
          >
            <Flex w="100%" justifyContent="space-between">
                
                {/* 🧭 LEFT GROUP: 40% width */}
                <Flex w="40%"> 
                    <TabWithSeparator label="Home" needsSeparator {...tabStyle} /> 
                    <TabWithSeparator label="Chat" needsSeparator {...tabStyle} /> 
                    <TabWithSeparator label="Visualization" {...tabStyle} /> 
                </Flex>

                {/* 🔒 RIGHT GROUP: 20% width */}
                <Flex w="20%" justifyContent="flex-end"> 
                    <TabWithSeparator label="About" needsSeparator {...tabStyle} />
                    <TabWithSeparator label="Login/Signup" {...tabStyle} />
                </Flex>
            </Flex>
          </TabList>

          <TabPanels h="calc(100% - 50px)">
            {/* TabPanel 1: Home (Index 0) */}
            <TabPanel h="100%" overflowY="hidden" overflowX="hidden">
              <Home setTabIndex={setTabIndex} />
            </TabPanel>

            {/* TabPanel 2: Chat (Index 1) - Pass the setter function */}
            <TabPanel h="100%" overflowY="auto">
              <Chat
                messages={messages}
                setMessages={setMessages}
                records={records}
                setRecords={setRecords}
                waiting={waiting}
                setWaiting={setWaiting}
                setTabIndex={setTabIndex} // ✨ NEW PROP
                //added new line here
                setRelevantProfileIds={setRelevantProfileIds}
              />
            </TabPanel>

            {/*changed line old code:
            <Visualization records={records} /> 
            */ }
            {/* TabPanel 3: Visualization (Index 2) */}
            <TabPanel h="100%" overflowY="auto">
              <Visualization records={records} relevantProfileIds={relevantProfileIds} /> 
            </TabPanel>
            
            {/* TabPanel 4: About (Index 3) */}
            <TabPanel h="100%" overflowY="auto">
                <Box color="white">AI-Powered Conversational Interface for ARGO Ocean Data Discovery and Visualization.</Box>
            </TabPanel>
            
            {/* TabPanel 5: Login/Signup (Index 4) */}
            <TabPanel h="100%" overflowY="auto">
                <Box color="white">Login/Signup form goes here.</Box>
            </TabPanel>
          </TabPanels>
        </Tabs>
      </Box>
    </ChakraProvider>
  );
}

export default App;