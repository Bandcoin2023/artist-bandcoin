"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { ArrowRight, Palette, Globe, Award, Zap } from "lucide-react";

import { Button } from "~/components/shadcn/ui/button";
import { Card, CardContent } from "~/components/shadcn/ui/card";

export default function JoinArtistPage() {
  return (
    <div className="">
      {/* Background Elements */}

      <div className="container mx-auto px-4 py-12 md:py-24">
        <div className="mx-auto max-w-5xl">
          {/* Hero Section */}

          {/* Benefits Section */}
          <div className="mb-16">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="mb-12 text-center"
            >
              <h2 className="text-3xl font-bold">Why Join as an Artist?</h2>
              <p className="mx-auto mt-2 max-w-2xl text-muted-foreground">
                Our platform offers everything you need to showcase your talent
                and grow your audience.
              </p>
            </motion.div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
              {[
                {
                  icon: <Globe className="h-10 w-10" />,
                  title: "Global Reach",
                  description: "Share your work with audiences worldwide",
                },
                {
                  icon: <Award className="h-10 w-10" />,
                  title: "Artist Recognition",
                  description: "Get verified status and build credibility",
                },
                {
                  icon: <Zap className="h-10 w-10" />,
                  title: "Powerful Tools",
                  description: "Access exclusive Artist features and analytics",
                },
                {
                  icon: <Palette className="h-10 w-10" />,
                  title: "Creative Freedom",
                  description: "Express yourself with full creative control",
                },
              ].map((benefit, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 + index * 0.1 }}
                >
                  <Card className="h-full border transition-all duration-300 hover:border-primary hover:shadow-md">
                    <CardContent className="flex flex-col items-center p-6 text-center">
                      <div className="mb-4 rounded-full bg-primary/10  p-4">
                        {benefit.icon}
                      </div>
                      <h3 className="mb-2 text-xl font-semibold">
                        {benefit.title}
                      </h3>
                      <p className="text-muted-foreground">
                        {benefit.description}
                      </p>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>

          {/* CTA Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.6 }}
            className="rounded-2xl border border-primary/10 bg-primary/5 p-8 text-center md:p-12"
          >
            <h2 className="mb-4 text-2xl font-bold md:text-3xl">
              Ready to showcase your talent?
            </h2>
            <p className="mx-auto mb-8 max-w-2xl text-muted-foreground">
              Join our growing community of artists and start sharing your
              creative work today.
            </p>
            <Button size="lg" asChild className="rounded-full px-8">
              <Link href="/artist/create" className="gap-2">
                Join as Artist <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
