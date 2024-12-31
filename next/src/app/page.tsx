// Page
// /Users/matthewsimon/Documents/Github/solomon-electron/next/src/app/page.tsx

'use client'

import Image from "next/image";
import Header from "@/components/header";
import EmailForm from '@/components/emailform';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

const cards = new Array(6).fill({
  title: "Product #1",
  description: "This is the card description",
  content: "This is the card content",
  footer: "Footer"
});

const Homepage = () => {

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main>
        <div className="flex flex-col">
          {/* First row, 35px high with #646464 background color */}
          {/* Added a non-breaking space to ensure the row is visible */}
          <div className="h-5 bg-[#646464] border-b border-black">&nbsp;</div>

          {/* Second row, 50px high with #848484 background color */}
          <div className="h-9 pl-10 flex flex-row items-center text-white bg-[#848484] border-b border-black"style={{ fontFamily: 'Inter', fontSize: '20px', wordSpacing: '2em' }}>&nbsp;Safety. Determination. Reliability. Accountable.</div>

          {/* Third row, 70px deep with #AFAFAF background color */}
          <div className="h-16 flex flex-row  text-[#2B2B2B] items-center pl-14 bg-[#AFAFAF] border-b border-black tracking-normal" style={{ fontFamily: 'Inter', fontWeight: 800, fontSize: '32px', wordSpacing: '0.5em'}}>&nbsp;Leaks. Inspection. Design. Procurement. Project-Management.</div>

          {/* Container for two columns */}
          <div className="flex">

            {/* First column for list of buttons, taking up 1/4 of the space */}
            <div className="w-1/4 min-w-[275px] flex flex-col items-center space-y-12 p-12 border-r border-black bg-[#E9E9E5]">
              {/* Add buttons here */}
              <Button className="w-full lg:w-full" variant="custom" size="custom" style={{ fontFamily: 'Inter, sans-serif', fontWeight: 200, fontSize: '26px' }}>Services</Button>
              <Button className="w-full lg:w-full" variant="custom" size="custom" style={{ fontFamily: 'Inter, sans-serif', fontWeight: 200, fontSize: '26px' }}>How it works</Button>
              <Button className="w-full lg:w-full" variant="custom" size="custom" style={{ fontFamily: 'Inter, sans-serif', fontWeight: 200, fontSize: '26px' }}>Why it works</Button>
              <Button className="w-full lg:w-full" variant="custom" size="custom" style={{ fontFamily: 'Inter, sans-serif', fontWeight: 200, fontSize: '26px' }}>About us</Button>
              <Button className="w-full lg:w-full" variant="custom" size="custom" style={{ fontFamily: 'Inter, sans-serif', fontWeight: 200, fontSize: '26px' }}>Blog</Button>
              <Button className="w-full lg:w-full" variant="custom" size="custom" style={{ fontFamily: 'Inter, sans-serif', fontWeight: 200, fontSize: '26px' }}>Contact</Button>
            </div>

            {/* Second column for image, taking up 3/4 of the space */}
            <div className="w-3/4">
              <Image
                src="/hero-img3.svg" // replace with your image path
                alt="Description of the image"
                width={500} // adjust accordingly
                height={300} // adjust accordingly
                layout="responsive"
              />
            </div>
          </div>

          {/* New rows as per the requirements */}
          {/* Row 1, 35px high with #848484 background color */}
          <div className="h-5 bg-[#848484] border-b border-black">&nbsp;</div>

          {/* Row 2, 40px high with #646464 background color */}
          <div className="h-7 bg-[#646464] border-b border-black">&nbsp;</div>

          {/* Row 3, 70px deep with #4E4D4D background color and text */}
          <div className="h-24 bg-[#4E4D4D] border-b border-black flex flex-row items-center text-center px-14 text-white" style={{ fontFamily: 'Inter', fontSize: '20px', lineHeight: '1.5' }}>
            A healthy building envelope requires a long-term partner that can inspect, maintain, design, and follow-through with your project management requirements. That’s why we’ve designed an iterative plan where each step plays a crucial role in your roofing life-cycle.
          </div>

          {/* Row 4, 95px high with #4E4D4D background color, left blank for now */}
          <div className="flex flex-col mb-24">
            <div className="h-24 bg-[#323232] border-b border-black pb-12">&nbsp;
              <EmailForm />
            </div>
          </div>

          {/* New Card Array Section */}
          <div className="flex flex-col bg-[#E9E9E5] pt-8 pb-10 pl-5 pr-5">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 m-12 gap-8 p-4">
              {cards.map((card, index) => (
                <Card key={`card-${index}`} className="bg-white">
                  <CardHeader>
                    <CardTitle>{card.title}</CardTitle>
                    <CardDescription>{card.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p>{card.content}</p>
                  </CardContent>
                  <CardFooter>
                    <p>{card.footer}</p>
                  </CardFooter>
                </Card>
              ))}
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}

export default Homepage;
