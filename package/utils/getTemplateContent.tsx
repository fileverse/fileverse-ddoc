import { JSONContent } from '@tiptap/react';

export const getTemplateContent = (
  templateQuery: string,
): JSONContent | null => {
  switch (templateQuery) {
    case 'meeting-notes':
      return {
        type: 'doc',
        content: [
          {
            type: 'dBlock',
            content: [
              {
                type: 'heading',
                attrs: {
                  textAlign: 'left',
                  level: 1,
                },
                content: [
                  {
                    type: 'text',
                    text: '[Date] | [Event]',
                  },
                ],
              },
            ],
          },
          {
            type: 'dBlock',
            content: [
              {
                type: 'heading',
                attrs: {
                  textAlign: 'left',
                  level: 3,
                },
                content: [
                  {
                    type: 'text',
                    text: 'Notes',
                  },
                ],
              },
            ],
          },
          {
            type: 'dBlock',
            content: [
              {
                type: 'bulletList',
                attrs: {
                  tight: true,
                },
                content: [
                  {
                    type: 'listItem',
                    content: [
                      {
                        type: 'paragraph',
                        attrs: {
                          textAlign: 'left',
                        },
                        content: [
                          {
                            type: 'text',
                            text: 'Add note item',
                          },
                        ],
                      },
                    ],
                  },
                  {
                    type: 'listItem',
                    content: [
                      {
                        type: 'paragraph',
                        attrs: {
                          textAlign: 'left',
                        },
                        content: [
                          {
                            type: 'text',
                            text: 'Add note item',
                          },
                        ],
                      },
                    ],
                  },
                ],
              },
            ],
          },
          {
            type: 'dBlock',
            content: [
              {
                type: 'heading',
                attrs: {
                  textAlign: 'left',
                  level: 3,
                },
                content: [
                  {
                    type: 'text',
                    text: 'Action items',
                  },
                ],
              },
            ],
          },
          {
            type: 'dBlock',
            content: [
              {
                type: 'taskList',
                content: [
                  {
                    type: 'taskItem',
                    attrs: {
                      checked: false,
                    },
                    content: [
                      {
                        type: 'paragraph',
                        attrs: {
                          textAlign: 'left',
                        },
                        content: [
                          {
                            type: 'text',
                            text: 'Add action item',
                          },
                        ],
                      },
                    ],
                  },
                  {
                    type: 'taskItem',
                    attrs: {
                      checked: false,
                    },
                    content: [
                      {
                        type: 'paragraph',
                        attrs: {
                          textAlign: 'left',
                        },
                        content: [
                          {
                            type: 'text',
                            text: 'Add action item',
                          },
                        ],
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
        title: 'Meeting Notes',
      };
    case 'todo-list':
      return {
        type: 'doc',
        content: [
          {
            type: 'dBlock',
            content: [
              {
                type: 'heading',
                attrs: {
                  textAlign: 'left',
                  level: 1,
                },
                content: [
                  {
                    type: 'text',
                    text: '📋 To-do List',
                  },
                ],
              },
            ],
          },
          {
            type: 'dBlock',
            content: [
              {
                type: 'table',
                content: [
                  {
                    type: 'tableRow',
                    content: [
                      {
                        type: 'tableHeader',
                        attrs: {
                          colspan: 1,
                          rowspan: 1,
                          colwidth: null,
                        },
                        content: [
                          {
                            type: 'paragraph',
                            attrs: {
                              textAlign: 'left',
                            },
                            content: [
                              {
                                type: 'text',
                                text: 'Action item',
                              },
                            ],
                          },
                        ],
                      },
                      {
                        type: 'tableHeader',
                        attrs: {
                          colspan: 1,
                          rowspan: 1,
                          colwidth: null,
                        },
                        content: [
                          {
                            type: 'paragraph',
                            attrs: {
                              textAlign: 'left',
                            },
                            content: [
                              {
                                type: 'text',
                                text: 'Deadline',
                              },
                            ],
                          },
                        ],
                      },
                    ],
                  },
                  {
                    type: 'tableRow',
                    content: [
                      {
                        type: 'tableCell',
                        attrs: {
                          colspan: 1,
                          rowspan: 1,
                          colwidth: null,
                        },
                        content: [
                          {
                            type: 'taskList',
                            content: [
                              {
                                type: 'taskItem',
                                attrs: {
                                  checked: false,
                                },
                                content: [
                                  {
                                    type: 'paragraph',
                                    attrs: {
                                      textAlign: 'left',
                                    },
                                    content: [
                                      {
                                        type: 'text',
                                        text: 'Add action item',
                                      },
                                    ],
                                  },
                                ],
                              },
                            ],
                          },
                        ],
                      },
                      {
                        type: 'tableCell',
                        attrs: {
                          colspan: 1,
                          rowspan: 1,
                          colwidth: null,
                        },
                        content: [
                          {
                            type: 'paragraph',
                            attrs: {
                              textAlign: 'left',
                            },
                            content: [
                              {
                                type: 'text',
                                text: 'DD.MM.YYYY',
                              },
                            ],
                          },
                        ],
                      },
                    ],
                  },
                  {
                    type: 'tableRow',
                    content: [
                      {
                        type: 'tableCell',
                        attrs: {
                          colspan: 1,
                          rowspan: 1,
                          colwidth: null,
                        },
                        content: [
                          {
                            type: 'taskList',
                            content: [
                              {
                                type: 'taskItem',
                                attrs: {
                                  checked: false,
                                },
                                content: [
                                  {
                                    type: 'paragraph',
                                    attrs: {
                                      textAlign: 'left',
                                    },
                                    content: [
                                      {
                                        type: 'text',
                                        text: 'Add action item',
                                      },
                                    ],
                                  },
                                ],
                              },
                            ],
                          },
                        ],
                      },
                      {
                        type: 'tableCell',
                        attrs: {
                          colspan: 1,
                          rowspan: 1,
                          colwidth: null,
                        },
                        content: [
                          {
                            type: 'paragraph',
                            attrs: {
                              textAlign: 'left',
                            },
                            content: [
                              {
                                type: 'text',
                                text: 'DD.MM.YYYY',
                              },
                            ],
                          },
                        ],
                      },
                    ],
                  },
                  {
                    type: 'tableRow',
                    content: [
                      {
                        type: 'tableCell',
                        attrs: {
                          colspan: 1,
                          rowspan: 1,
                          colwidth: null,
                        },
                        content: [
                          {
                            type: 'taskList',
                            content: [
                              {
                                type: 'taskItem',
                                attrs: {
                                  checked: false,
                                },
                                content: [
                                  {
                                    type: 'paragraph',
                                    attrs: {
                                      textAlign: 'left',
                                    },
                                    content: [
                                      {
                                        type: 'text',
                                        text: 'Add action item',
                                      },
                                    ],
                                  },
                                ],
                              },
                            ],
                          },
                        ],
                      },
                      {
                        type: 'tableCell',
                        attrs: {
                          colspan: 1,
                          rowspan: 1,
                          colwidth: null,
                        },
                        content: [
                          {
                            type: 'paragraph',
                            attrs: {
                              textAlign: 'left',
                            },
                            content: [
                              {
                                type: 'text',
                                text: 'DD.MM.YYYY',
                              },
                            ],
                          },
                        ],
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
        title: 'To-do List',
      };
    case 'brainstorm':
      return {
        type: 'doc',
        content: [
          {
            type: 'dBlock',
            content: [
              {
                type: 'heading',
                attrs: {
                  textAlign: 'left',
                  level: 1,
                },
                content: [
                  {
                    type: 'text',
                    text: '💡 Brainstorming',
                  },
                ],
              },
            ],
          },
          {
            type: 'dBlock',
            content: [
              {
                type: 'heading',
                attrs: {
                  textAlign: 'left',
                  level: 2,
                },
                content: [
                  {
                    type: 'text',
                    text: '[Issues & Goals]',
                  },
                ],
              },
            ],
          },
          {
            type: 'dBlock',
            content: [
              {
                type: 'bulletList',
                attrs: {
                  tight: true,
                },
                content: [
                  {
                    type: 'listItem',
                    content: [
                      {
                        type: 'paragraph',
                        attrs: {
                          textAlign: 'left',
                        },
                        content: [
                          {
                            type: 'text',
                            text: 'First idea',
                          },
                        ],
                      },
                    ],
                  },
                  {
                    type: 'listItem',
                    content: [
                      {
                        type: 'paragraph',
                        attrs: {
                          textAlign: 'left',
                        },
                        content: [
                          {
                            type: 'text',
                            text: 'Second idea',
                          },
                        ],
                      },
                    ],
                  },
                  {
                    type: 'listItem',
                    content: [
                      {
                        type: 'paragraph',
                        attrs: {
                          textAlign: 'left',
                        },
                        content: [
                          {
                            type: 'text',
                            text: 'Third idea',
                          },
                        ],
                      },
                    ],
                  },
                ],
              },
            ],
          },
          {
            type: 'dBlock',
            content: [
              {
                type: 'heading',
                attrs: {
                  textAlign: 'left',
                  level: 2,
                },
                content: [
                  {
                    type: 'text',
                    text: 'Summaries:',
                  },
                ],
              },
            ],
          },
          {
            type: 'dBlock',
            content: [
              {
                type: 'bulletList',
                attrs: {
                  tight: true,
                },
                content: [
                  {
                    type: 'listItem',
                    content: [
                      {
                        type: 'paragraph',
                        attrs: {
                          textAlign: 'left',
                        },
                        content: [
                          {
                            type: 'text',
                            text: 'Summary 1',
                          },
                        ],
                      },
                    ],
                  },
                  {
                    type: 'listItem',
                    content: [
                      {
                        type: 'paragraph',
                        attrs: {
                          textAlign: 'left',
                        },
                        content: [
                          {
                            type: 'text',
                            text: 'Summary 2',
                          },
                        ],
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
        title: 'Brainstorming',
      };
    case 'breathe':
      return {
        type: 'doc',
        content: [
          {
            type: 'dBlock',
            content: [
              {
                type: 'heading',
                attrs: {
                  textAlign: 'center',
                  level: 1,
                },
                content: [
                  {
                    type: 'text',
                    text: 'Take your time',
                  },
                ],
              },
            ],
          },
          {
            type: 'dBlock',
            content: [
              {
                type: 'paragraph',
                attrs: {
                  textAlign: 'center',
                },
                content: [
                  {
                    type: 'text',
                    text: 'Just breathe',
                  },
                ],
              },
            ],
          },
          {
            type: 'dBlock',
            content: [
              {
                type: 'resizableMedia',
                attrs: {
                  src: 'https://i.imgur.com/Huou7Gh.gif',
                  'media-type': 'img',
                  alt: null,
                  title: null,
                  width: '100%',
                  height: 'auto',
                  dataAlign: 'center',
                  dataFloat: null,
                },
              },
            ],
          },
          {
            type: 'dBlock',
            content: [
              {
                type: 'heading',
                attrs: {
                  textAlign: 'center',
                  level: 3,
                },
                content: [
                  {
                    type: 'text',
                    text: 'Follow the breathing triangle, do it 5 times',
                  },
                ],
              },
            ],
          },
          {
            type: 'dBlock',
            content: [
              {
                type: 'paragraph',
                attrs: {
                  textAlign: 'center',
                },
                content: [
                  {
                    type: 'text',
                    text: "When you are overwhelmed at work… or after handling a tough situation... when the market plumets.. when everything goes wrong.. or you're having a simple writer's block",
                  },
                ],
              },
            ],
          },
        ],
        title: 'Breathe',
      };
    case 'pretend-to-work':
      return {
        type: 'doc',
        content: [
          {
            type: 'dBlock',
            content: [
              {
                type: 'heading',
                attrs: {
                  textAlign: 'left',
                  level: 1,
                },
                content: [
                  {
                    type: 'text',
                    marks: [
                      {
                        type: 'textStyle',
                        attrs: {
                          fontFamily: 'Georgia, serif',
                          color: '',
                        },
                      },
                    ],
                    text: 'Some ways to use ZK-SNARKs for privacy',
                  },
                ],
              },
            ],
          },
          {
            type: 'dBlock',
            content: [
              {
                type: 'paragraph',
                attrs: {
                  textAlign: 'left',
                },
                content: [
                  {
                    type: 'text',
                    text: 'ZK-SNARKs are a powerful cryptographic tool, and an increasingly important part of the applications that people are building both in the blockchain space and beyond. But they are complicated, both in terms of ',
                  },
                  {
                    type: 'text',
                    marks: [
                      {
                        type: 'italic',
                      },
                    ],
                    text: 'how they work',
                  },
                  {
                    type: 'text',
                    text: ', and in terms of ',
                  },
                  {
                    type: 'text',
                    marks: [
                      {
                        type: 'italic',
                      },
                    ],
                    text: 'how you can use them',
                  },
                  {
                    type: 'text',
                    text: '.',
                  },
                ],
              },
            ],
          },
          {
            type: 'dBlock',
            content: [
              {
                type: 'heading',
                attrs: {
                  textAlign: 'left',
                  level: 2,
                },
                content: [
                  {
                    type: 'text',
                    text: 'What does a ZK-SNARK do?',
                  },
                ],
              },
            ],
          },
          {
            type: 'dBlock',
            content: [
              {
                type: 'paragraph',
                attrs: {
                  textAlign: 'left',
                },
                content: [
                  {
                    type: 'text',
                    text: 'Suppose that you have a public input x, a private input w, and a (public) function ',
                  },
                  {
                    type: 'text',
                    marks: [
                      {
                        type: 'textStyle',
                        attrs: {
                          fontFamily: 'MJXc-TeX-math-Iw',
                          color: '',
                        },
                      },
                    ],
                    text: 'f(x,w)→{True,False}',
                  },
                  {
                    type: 'text',
                    text: ' that performs some kind of verification on the inputs. With a ZK-SNARK, you can prove that you know an w such that ',
                  },
                  {
                    type: 'text',
                    marks: [
                      {
                        type: 'textStyle',
                        attrs: {
                          fontFamily: 'MJXc-TeX-math-Iw',
                          color: '',
                        },
                      },
                    ],
                    text: 'f(x,w)=True',
                  },
                  {
                    type: 'text',
                    text: ' for some given ',
                  },
                  {
                    type: 'text',
                    marks: [
                      {
                        type: 'textStyle',
                        attrs: {
                          fontFamily: 'MJXc-TeX-math-Iw',
                          color: '',
                        },
                      },
                    ],
                    text: 'f',
                  },
                  {
                    type: 'text',
                    text: ' and ',
                  },
                  {
                    type: 'text',
                    marks: [
                      {
                        type: 'textStyle',
                        attrs: {
                          fontFamily: 'MJXc-TeX-math-Iw',
                          color: '',
                        },
                      },
                    ],
                    text: 'x',
                  },
                  {
                    type: 'text',
                    text: ', without revealing what ',
                  },
                  {
                    type: 'text',
                    marks: [
                      {
                        type: 'textStyle',
                        attrs: {
                          fontFamily: 'MJXc-TeX-math-Iw',
                          color: '',
                        },
                      },
                    ],
                    text: 'w',
                  },
                  {
                    type: 'text',
                    text: ' is. Additionally, the verifier can verify the proof much faster than it would take for them to compute ',
                  },
                  {
                    type: 'text',
                    marks: [
                      {
                        type: 'textStyle',
                        attrs: {
                          fontFamily: 'MJXc-TeX-math-Iw',
                          color: '',
                        },
                      },
                    ],
                    text: 'f(x,w)',
                  },
                  {
                    type: 'text',
                    text: ' themselves, even if they know ',
                  },
                  {
                    type: 'text',
                    marks: [
                      {
                        type: 'textStyle',
                        attrs: {
                          fontFamily: 'MJXc-TeX-math-Iw',
                          color: '',
                        },
                      },
                    ],
                    text: 'w',
                  },
                  {
                    type: 'text',
                    text: '.',
                  },
                ],
              },
            ],
          },
          {
            type: 'dBlock',
            content: [
              {
                type: 'resizableMedia',
                attrs: {
                  src: 'https://vitalik.eth.limo/images/using_snarks/definition.png',
                  'media-type': 'img',
                  alt: null,
                  title: null,
                  width: '100%',
                  height: 'auto',
                  dataAlign: 'center',
                  dataFloat: null,
                },
              },
            ],
          },
          {
            type: 'dBlock',
            content: [
              {
                type: 'paragraph',
                attrs: {
                  textAlign: 'left',
                },
                content: [
                  {
                    type: 'text',
                    text: 'This gives the ZK-SNARK its two properties: ',
                  },
                  {
                    type: 'text',
                    marks: [
                      {
                        type: 'bold',
                      },
                    ],
                    text: 'privacy',
                  },
                  {
                    type: 'text',
                    text: ' and ',
                  },
                  {
                    type: 'text',
                    marks: [
                      {
                        type: 'bold',
                      },
                    ],
                    text: 'scalability',
                  },
                  {
                    type: 'text',
                    text: '. As mentioned above, in this post our examples will focus on privacy.',
                  },
                ],
              },
            ],
          },
          {
            type: 'dBlock',
            content: [
              {
                type: 'heading',
                attrs: {
                  textAlign: 'left',
                  level: 2,
                },
                content: [
                  {
                    type: 'text',
                    text: 'Holding centralized parties accountable',
                  },
                ],
              },
            ],
          },
          {
            type: 'dBlock',
            content: [
              {
                type: 'paragraph',
                attrs: {
                  textAlign: 'left',
                },
                content: [
                  {
                    type: 'text',
                    text: 'Sometimes, you need to build a scheme that has a central "operator" of some kind. This could be for many reasons: sometimes it\'s for scalability, and sometimes it\'s for privacy - specifically, the privacy of data held by the operator.',
                  },
                ],
              },
            ],
          },
          {
            type: 'dBlock',
            content: [
              {
                type: 'paragraph',
                attrs: {
                  textAlign: 'left',
                },
                content: [
                  {
                    type: 'text',
                    text: 'The MACI coercion-resistant voting system, for example, requires voters to submit their votes on-chain encrypted to a secret key held by a central operator. The operator would decrypt all the votes on-chain, count them up, and reveal the final result, along with a ZK-SNARK proving that they did everything correctly. This extra complexity is necessary to ensure a strong privacy property (called ',
                  },
                  {
                    type: 'text',
                    marks: [
                      {
                        type: 'bold',
                      },
                    ],
                    text: 'coercion-resistance',
                  },
                  {
                    type: 'text',
                    text: '): that users cannot prove to others how they voted even if they wanted to.',
                  },
                ],
              },
            ],
          },
          {
            type: 'dBlock',
            content: [
              {
                type: 'paragraph',
                attrs: {
                  textAlign: 'left',
                },
                content: [
                  {
                    type: 'text',
                    text: 'Thanks to blockchains and ZK-SNARKs, the amount of trust in the operator can be kept very low. A malicious operator could still break coercion resistance, but because votes are published on the blockchain, the operator cannot cheat by censoring votes, and because the operator must provide a ZK-SNARK, they cannot cheat by mis-calculating the result.',
                  },
                ],
              },
            ],
          },
          {
            type: 'dBlock',
            content: [
              {
                type: 'heading',
                attrs: {
                  textAlign: 'left',
                  level: 2,
                },
                content: [
                  {
                    type: 'text',
                    text: 'Combining ZK-SNARKs with MPC',
                  },
                ],
              },
            ],
          },
          {
            type: 'dBlock',
            content: [
              {
                type: 'paragraph',
                attrs: {
                  textAlign: 'left',
                },
                content: [
                  {
                    type: 'text',
                    text: "A more advanced use of ZK-SNARKs involves making proofs over computations where the inputs are split between two or more parties, and we don't want each party to learn the other parties' inputs. You can satisfy the privacy requirement with ",
                  },
                  {
                    type: 'text',
                    marks: [
                      {
                        type: 'link',
                        attrs: {
                          href: 'https://vitalik.eth.limo/general/2020/03/21/garbled.html',
                          target: '_blank',
                          rel: 'noopener noreferrer',
                          class: 'custom-text-link',
                        },
                      },
                    ],
                    text: 'garbled circuits',
                  },
                  {
                    type: 'text',
                    text: ' in the 2-party case, and more complicated multi-party computation protocols in the N-party case. ZK-SNARKs can be combined with these protocols to do verifiable multi-party computation.',
                  },
                ],
              },
            ],
          },
          {
            type: 'dBlock',
            content: [
              {
                type: 'paragraph',
                attrs: {
                  textAlign: 'left',
                },
                content: [
                  {
                    type: 'text',
                    text: 'This could enable more advanced reputation systems where multiple participants can perform joint computations over their private inputs, it could enable privacy-preserving but authenticated data markets, and many other applications. That said, note that the math for doing this efficiently is still relatively in its infancy.',
                  },
                ],
              },
            ],
          },
          {
            type: 'dBlock',
            content: [
              {
                type: 'blockquote',
                content: [
                  {
                    type: 'paragraph',
                    attrs: {
                      textAlign: 'left',
                    },
                    content: [
                      {
                        type: 'text',
                        text: 'Read the full article by ',
                      },
                      {
                        type: 'text',
                        marks: [
                          {
                            type: 'link',
                            attrs: {
                              href: 'https://vitalik.eth.limo/general/2021/01/26/snarks.html',
                              target: '_blank',
                              rel: 'noopener noreferrer',
                              class: 'custom-text-link',
                            },
                          },
                        ],
                        text: 'Vitalik Buterin',
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
        title: 'Pretend To Work',
      };
    case 'resume': {
      return {
        type: 'doc',
        content: [
          {
            type: 'dBlock',
            attrs: {
              isCorrupted: false,
            },
            content: [
              {
                type: 'heading',
                attrs: {
                  textAlign: 'center',
                  level: 1,
                },
                content: [
                  {
                    type: 'text',
                    marks: [
                      {
                        type: 'textStyle',
                        attrs: {
                          fontFamily: null,
                          fontSize: null,
                          color: '',
                        },
                      },
                    ],
                    text: 'John Doe',
                  },
                ],
              },
            ],
          },
          {
            type: 'dBlock',
            attrs: {
              isCorrupted: false,
            },
            content: [
              {
                type: 'paragraph',
                attrs: {
                  class: 'select-text pointer-events-auto',
                  textAlign: 'left',
                },
                content: [
                  {
                    type: 'text',
                    marks: [
                      {
                        type: 'textStyle',
                        attrs: {
                          fontFamily: null,
                          fontSize: null,
                          color: '',
                        },
                      },
                    ],
                    text: '(123) 456-7890 | ',
                  },
                  {
                    type: 'text',
                    marks: [
                      {
                        type: 'link',
                        attrs: {
                          href: 'mailto:john.doe@example.com',
                          target: '_blank',
                          rel: 'noopener noreferrer',
                          class: 'custom-text-link',
                        },
                      },
                      {
                        type: 'textStyle',
                        attrs: {
                          fontFamily: null,
                          fontSize: null,
                          color: '',
                        },
                      },
                    ],
                    text: 'john.doe@example.com',
                  },
                  {
                    type: 'text',
                    marks: [
                      {
                        type: 'textStyle',
                        attrs: {
                          fontFamily: null,
                          fontSize: null,
                          color: '',
                        },
                      },
                    ],
                    text: ' | ',
                  },
                  {
                    type: 'text',
                    marks: [
                      {
                        type: 'link',
                        attrs: {
                          href: 'https://linkedin.com/in/johndoe',
                          target: '_blank',
                          rel: 'noopener noreferrer',
                          class: 'custom-text-link',
                        },
                      },
                      {
                        type: 'textStyle',
                        attrs: {
                          fontFamily: null,
                          fontSize: null,
                          color: '',
                        },
                      },
                    ],
                    text: 'linkedin.com/in/johndoe',
                  },
                  {
                    type: 'text',
                    marks: [
                      {
                        type: 'textStyle',
                        attrs: {
                          fontFamily: null,
                          fontSize: null,
                          color: '',
                        },
                      },
                    ],
                    text: ' | 123 Main St, Cityville',
                  },
                ],
              },
            ],
          },
          {
            type: 'dBlock',
            attrs: {
              isCorrupted: false,
            },
            content: [
              {
                type: 'horizontalRule',
              },
            ],
          },
          {
            type: 'dBlock',
            attrs: {
              isCorrupted: false,
            },
            content: [
              {
                type: 'heading',
                attrs: {
                  textAlign: 'left',
                  level: 3,
                },
                content: [
                  {
                    type: 'text',
                    marks: [
                      {
                        type: 'textStyle',
                        attrs: {
                          fontFamily: null,
                          fontSize: null,
                          color: '',
                        },
                      },
                    ],
                    text: 'Education',
                  },
                ],
              },
            ],
          },
          {
            type: 'dBlock',
            attrs: {
              isCorrupted: false,
            },
            content: [
              {
                type: 'paragraph',
                attrs: {
                  class: 'select-text pointer-events-auto',
                  textAlign: 'left',
                },
                content: [
                  {
                    type: 'text',
                    marks: [
                      {
                        type: 'textStyle',
                        attrs: {
                          fontFamily: null,
                          fontSize: null,
                          color: '',
                        },
                      },
                      {
                        type: 'bold',
                      },
                    ],
                    text: 'Bachelor of [Field of Study]                                                                                             Cambridge, MA',
                  },
                  {
                    type: 'hardBreak',
                  },
                  {
                    type: 'text',
                    marks: [
                      {
                        type: 'textStyle',
                        attrs: {
                          fontFamily: null,
                          fontSize: null,
                          color: '',
                        },
                      },
                      {
                        type: 'italic',
                      },
                    ],
                    text: 'University of Cityville',
                  },
                  {
                    type: 'text',
                    marks: [
                      {
                        type: 'textStyle',
                        attrs: {
                          fontFamily: null,
                          fontSize: null,
                          color: '',
                        },
                      },
                    ],
                    text: '                                                                                                   ',
                  },
                  {
                    type: 'text',
                    marks: [
                      {
                        type: 'textStyle',
                        attrs: {
                          fontFamily: null,
                          fontSize: null,
                          color: '',
                        },
                      },
                      {
                        type: 'italic',
                      },
                    ],
                    text: 'Graduation Date',
                  },
                  {
                    type: 'hardBreak',
                  },
                  {
                    type: 'text',
                    marks: [
                      {
                        type: 'textStyle',
                        attrs: {
                          fontFamily: null,
                          fontSize: null,
                          color: '',
                        },
                      },
                    ],
                    text: 'Relevant Coursework',
                  },
                ],
              },
            ],
          },
          {
            type: 'dBlock',
            attrs: {
              isCorrupted: false,
            },
            content: [
              {
                type: 'paragraph',
                attrs: {
                  class: 'select-text pointer-events-auto',
                  textAlign: 'left',
                },
                content: [
                  {
                    type: 'text',
                    marks: [
                      {
                        type: 'textStyle',
                        attrs: {
                          fontFamily: null,
                          fontSize: null,
                          color: '',
                        },
                      },
                      {
                        type: 'bold',
                      },
                    ],
                    text: 'Study Abroad                                                                                                                              Tokyo, Japan',
                  },
                  {
                    type: 'hardBreak',
                  },
                  {
                    type: 'text',
                    marks: [
                      {
                        type: 'textStyle',
                        attrs: {
                          fontFamily: null,
                          fontSize: null,
                          color: '',
                        },
                      },
                    ],
                    text: 'Relevant Coursework',
                  },
                  {
                    type: 'text',
                    marks: [
                      {
                        type: 'textStyle',
                        attrs: {
                          fontFamily: null,
                          fontSize: null,
                          color: '',
                        },
                      },
                      {
                        type: 'bold',
                      },
                    ],
                    text: '                                                                                            ',
                  },
                  {
                    type: 'text',
                    marks: [
                      {
                        type: 'textStyle',
                        attrs: {
                          fontFamily: null,
                          fontSize: null,
                          color: '',
                        },
                      },
                      {
                        type: 'italic',
                      },
                    ],
                    text: 'month/year - month/year',
                  },
                ],
              },
            ],
          },
          {
            type: 'dBlock',
            attrs: {
              isCorrupted: false,
            },
            content: [
              {
                type: 'horizontalRule',
              },
            ],
          },
          {
            type: 'dBlock',
            attrs: {
              isCorrupted: false,
            },
            content: [
              {
                type: 'heading',
                attrs: {
                  textAlign: 'left',
                  level: 3,
                },
                content: [
                  {
                    type: 'text',
                    marks: [
                      {
                        type: 'textStyle',
                        attrs: {
                          fontFamily: null,
                          fontSize: null,
                          color: '',
                        },
                      },
                    ],
                    text: 'Work Experience',
                  },
                ],
              },
            ],
          },
          {
            type: 'dBlock',
            attrs: {
              isCorrupted: false,
            },
            content: [
              {
                type: 'paragraph',
                attrs: {
                  class: 'select-text pointer-events-auto',
                  textAlign: 'left',
                },
                content: [
                  {
                    type: 'text',
                    marks: [
                      {
                        type: 'textStyle',
                        attrs: {
                          fontFamily: null,
                          fontSize: null,
                          color: '',
                        },
                      },
                      {
                        type: 'bold',
                      },
                    ],
                    text: 'Senior [Job Title]',
                  },
                  {
                    type: 'text',
                    marks: [
                      {
                        type: 'textStyle',
                        attrs: {
                          fontFamily: null,
                          fontSize: null,
                          color: '',
                        },
                      },
                    ],
                    text: '                                                                                                   ',
                  },
                  {
                    type: 'text',
                    marks: [
                      {
                        type: 'textStyle',
                        attrs: {
                          fontFamily: null,
                          fontSize: null,
                          color: '',
                        },
                      },
                      {
                        type: 'italic',
                      },
                    ],
                    text: 'Jan 2021 – Present',
                  },
                  {
                    type: 'hardBreak',
                  },
                  {
                    type: 'text',
                    marks: [
                      {
                        type: 'textStyle',
                        attrs: {
                          fontFamily: null,
                          fontSize: null,
                          color: '',
                        },
                      },
                      {
                        type: 'italic',
                      },
                    ],
                    text: 'ABC Corporation, Cityville',
                  },
                ],
              },
            ],
          },
          {
            type: 'dBlock',
            attrs: {
              isCorrupted: false,
            },
            content: [
              {
                type: 'bulletList',
                attrs: {
                  tight: false,
                },
                content: [
                  {
                    type: 'listItem',
                    content: [
                      {
                        type: 'paragraph',
                        attrs: {
                          class: 'select-text pointer-events-auto',
                          textAlign: 'left',
                        },
                        content: [
                          {
                            type: 'text',
                            marks: [
                              {
                                type: 'textStyle',
                                attrs: {
                                  fontFamily: null,
                                  fontSize: null,
                                  color: '',
                                },
                              },
                            ],
                            text: 'Lead a team of 10+ to achieve a 25% increase in departmental efficiency.',
                          },
                        ],
                      },
                    ],
                  },
                  {
                    type: 'listItem',
                    content: [
                      {
                        type: 'paragraph',
                        attrs: {
                          class: 'select-text pointer-events-auto',
                          textAlign: 'left',
                        },
                        content: [
                          {
                            type: 'text',
                            marks: [
                              {
                                type: 'textStyle',
                                attrs: {
                                  fontFamily: null,
                                  fontSize: null,
                                  color: '',
                                },
                              },
                            ],
                            text: 'Spearheaded [Project Name], resulting in $500K annual cost savings.',
                          },
                        ],
                      },
                    ],
                  },
                  {
                    type: 'listItem',
                    content: [
                      {
                        type: 'paragraph',
                        attrs: {
                          class: 'select-text pointer-events-auto',
                          textAlign: 'left',
                        },
                        content: [
                          {
                            type: 'text',
                            marks: [
                              {
                                type: 'textStyle',
                                attrs: {
                                  fontFamily: null,
                                  fontSize: null,
                                  color: '',
                                },
                              },
                            ],
                            text: 'Collaborate cross-functionally to streamline workflows and improve client satisfaction.',
                          },
                        ],
                      },
                    ],
                  },
                ],
              },
            ],
          },
          {
            type: 'dBlock',
            attrs: {
              isCorrupted: false,
            },
            content: [
              {
                type: 'paragraph',
                attrs: {
                  class: 'select-text pointer-events-auto',
                  textAlign: 'left',
                },
                content: [
                  {
                    type: 'text',
                    marks: [
                      {
                        type: 'textStyle',
                        attrs: {
                          fontFamily: null,
                          fontSize: null,
                          color: '',
                        },
                      },
                      {
                        type: 'bold',
                      },
                    ],
                    text: '[Job Title]                                                                                                                      ',
                  },
                  {
                    type: 'text',
                    marks: [
                      {
                        type: 'textStyle',
                        attrs: {
                          fontFamily: null,
                          fontSize: null,
                          color: '',
                        },
                      },
                      {
                        type: 'italic',
                      },
                    ],
                    text: 'Mar 2018 – Dec 2020',
                  },
                  {
                    type: 'hardBreak',
                  },
                  {
                    type: 'text',
                    marks: [
                      {
                        type: 'textStyle',
                        attrs: {
                          fontFamily: null,
                          fontSize: null,
                          color: '',
                        },
                      },
                      {
                        type: 'italic',
                      },
                    ],
                    text: 'XYZ Solutions, Townsville',
                  },
                ],
              },
            ],
          },
          {
            type: 'dBlock',
            attrs: {
              isCorrupted: false,
            },
            content: [
              {
                type: 'bulletList',
                attrs: {
                  tight: false,
                },
                content: [
                  {
                    type: 'listItem',
                    content: [
                      {
                        type: 'paragraph',
                        attrs: {
                          class: 'select-text pointer-events-auto',
                          textAlign: 'left',
                        },
                        content: [
                          {
                            type: 'text',
                            marks: [
                              {
                                type: 'textStyle',
                                attrs: {
                                  fontFamily: null,
                                  fontSize: null,
                                  color: '',
                                },
                              },
                            ],
                            text: 'Managed [Key Responsibility], improving process accuracy by 30%.',
                          },
                        ],
                      },
                    ],
                  },
                  {
                    type: 'listItem',
                    content: [
                      {
                        type: 'paragraph',
                        attrs: {
                          class: 'select-text pointer-events-auto',
                          textAlign: 'left',
                        },
                        content: [
                          {
                            type: 'text',
                            marks: [
                              {
                                type: 'textStyle',
                                attrs: {
                                  fontFamily: null,
                                  fontSize: null,
                                  color: '',
                                },
                              },
                            ],
                            text: 'Trained 15+ new hires in company protocols and software tools.',
                          },
                        ],
                      },
                    ],
                  },
                  {
                    type: 'listItem',
                    content: [
                      {
                        type: 'paragraph',
                        attrs: {
                          class: 'select-text pointer-events-auto',
                          textAlign: 'left',
                        },
                        content: [
                          {
                            type: 'text',
                            marks: [
                              {
                                type: 'textStyle',
                                attrs: {
                                  fontFamily: null,
                                  fontSize: null,
                                  color: '',
                                },
                              },
                            ],
                            text: 'Recognized as "Employee of the Quarter" twice for exceptional performance.',
                          },
                        ],
                      },
                    ],
                  },
                ],
              },
            ],
          },
          {
            type: 'dBlock',
            attrs: {
              isCorrupted: false,
            },
            content: [
              {
                type: 'paragraph',
                attrs: {
                  class: 'select-text pointer-events-auto',
                  textAlign: 'left',
                },
                content: [
                  {
                    type: 'text',
                    marks: [
                      {
                        type: 'textStyle',
                        attrs: {
                          fontFamily: null,
                          fontSize: null,
                          color: '',
                        },
                      },
                      {
                        type: 'bold',
                      },
                    ],
                    text: '[Job Title] ',
                  },
                  {
                    type: 'text',
                    marks: [
                      {
                        type: 'textStyle',
                        attrs: {
                          fontFamily: null,
                          fontSize: null,
                          color: '',
                        },
                      },
                    ],
                    text: '                                                                                                            ',
                  },
                  {
                    type: 'text',
                    marks: [
                      {
                        type: 'textStyle',
                        attrs: {
                          fontFamily: null,
                          fontSize: null,
                          color: '',
                        },
                      },
                      {
                        type: 'italic',
                      },
                    ],
                    text: 'Jun 2015 – Feb 2018',
                  },
                  {
                    type: 'hardBreak',
                  },
                  {
                    type: 'text',
                    marks: [
                      {
                        type: 'textStyle',
                        attrs: {
                          fontFamily: null,
                          fontSize: null,
                          color: '',
                        },
                      },
                      {
                        type: 'italic',
                      },
                    ],
                    text: '123 Industries, Villagetown ',
                  },
                ],
              },
            ],
          },
          {
            type: 'dBlock',
            attrs: {
              isCorrupted: false,
            },
            content: [
              {
                type: 'bulletList',
                attrs: {
                  tight: false,
                },
                content: [
                  {
                    type: 'listItem',
                    content: [
                      {
                        type: 'paragraph',
                        attrs: {
                          class: 'select-text pointer-events-auto',
                          textAlign: 'left',
                        },
                        content: [
                          {
                            type: 'text',
                            marks: [
                              {
                                type: 'textStyle',
                                attrs: {
                                  fontFamily: null,
                                  fontSize: null,
                                  color: '',
                                },
                              },
                            ],
                            text: 'Developed [Initiative Name], boosting customer retention by 15%.',
                          },
                        ],
                      },
                    ],
                  },
                  {
                    type: 'listItem',
                    content: [
                      {
                        type: 'paragraph',
                        attrs: {
                          class: 'select-text pointer-events-auto',
                          textAlign: 'left',
                        },
                        content: [
                          {
                            type: 'text',
                            marks: [
                              {
                                type: 'textStyle',
                                attrs: {
                                  fontFamily: null,
                                  fontSize: null,
                                  color: '',
                                },
                              },
                            ],
                            text: 'Analyzed data trends to provide actionable insights for senior leadership.',
                          },
                        ],
                      },
                    ],
                  },
                  {
                    type: 'listItem',
                    content: [
                      {
                        type: 'paragraph',
                        attrs: {
                          class: 'select-text pointer-events-auto',
                          textAlign: 'left',
                        },
                        content: [
                          {
                            type: 'text',
                            marks: [
                              {
                                type: 'textStyle',
                                attrs: {
                                  fontFamily: null,
                                  fontSize: null,
                                  color: '',
                                },
                              },
                            ],
                            text: 'Coordinated with vendors to reduce supply chain delays by 20%.',
                          },
                        ],
                      },
                    ],
                  },
                ],
              },
            ],
          },
          {
            type: 'dBlock',
            attrs: {
              isCorrupted: false,
            },
            content: [
              {
                type: 'paragraph',
                attrs: {
                  class: 'select-text pointer-events-auto',
                  textAlign: 'left',
                },
                content: [
                  {
                    type: 'text',
                    marks: [
                      {
                        type: 'textStyle',
                        attrs: {
                          fontFamily: null,
                          fontSize: null,
                          color: '',
                        },
                      },
                      {
                        type: 'bold',
                      },
                    ],
                    text: 'Junior [Job Title]                                                                                                        ',
                  },
                  {
                    type: 'text',
                    marks: [
                      {
                        type: 'textStyle',
                        attrs: {
                          fontFamily: null,
                          fontSize: null,
                          color: '',
                        },
                      },
                      {
                        type: 'italic',
                      },
                    ],
                    text: 'Aug 2013 – May 2015',
                  },
                  {
                    type: 'hardBreak',
                  },
                  {
                    type: 'text',
                    marks: [
                      {
                        type: 'textStyle',
                        attrs: {
                          fontFamily: null,
                          fontSize: null,
                          color: '',
                        },
                      },
                      {
                        type: 'italic',
                      },
                    ],
                    text: 'Starter Company, Hamlet City     ',
                  },
                  {
                    type: 'text',
                    marks: [
                      {
                        type: 'textStyle',
                        attrs: {
                          fontFamily: null,
                          fontSize: null,
                          color: '',
                        },
                      },
                    ],
                    text: '                                                         ',
                  },
                ],
              },
            ],
          },
          {
            type: 'dBlock',
            attrs: {
              isCorrupted: false,
            },
            content: [
              {
                type: 'bulletList',
                attrs: {
                  tight: false,
                },
                content: [
                  {
                    type: 'listItem',
                    content: [
                      {
                        type: 'paragraph',
                        attrs: {
                          class: 'select-text pointer-events-auto',
                          textAlign: 'left',
                        },
                        content: [
                          {
                            type: 'text',
                            marks: [
                              {
                                type: 'textStyle',
                                attrs: {
                                  fontFamily: null,
                                  fontSize: null,
                                  color: '',
                                },
                              },
                            ],
                            text: 'Assisted in [Core Task], supporting team goals and deadlines.',
                          },
                        ],
                      },
                    ],
                  },
                  {
                    type: 'listItem',
                    content: [
                      {
                        type: 'paragraph',
                        attrs: {
                          class: 'select-text pointer-events-auto',
                          textAlign: 'left',
                        },
                        content: [
                          {
                            type: 'text',
                            marks: [
                              {
                                type: 'textStyle',
                                attrs: {
                                  fontFamily: null,
                                  fontSize: null,
                                  color: '',
                                },
                              },
                            ],
                            text: 'Maintained detailed records with 99% accuracy.',
                          },
                        ],
                      },
                    ],
                  },
                  {
                    type: 'listItem',
                    content: [
                      {
                        type: 'paragraph',
                        attrs: {
                          class: 'select-text pointer-events-auto',
                          textAlign: 'left',
                        },
                        content: [
                          {
                            type: 'text',
                            marks: [
                              {
                                type: 'textStyle',
                                attrs: {
                                  fontFamily: null,
                                  fontSize: null,
                                  color: '',
                                },
                              },
                            ],
                            text: 'Earned promotion within 18 months for exceeding KPIs.',
                          },
                        ],
                      },
                    ],
                  },
                ],
              },
            ],
          },
          {
            type: 'dBlock',
            attrs: {
              isCorrupted: false,
            },
            content: [
              {
                type: 'horizontalRule',
              },
            ],
          },
          {
            type: 'dBlock',
            attrs: {
              isCorrupted: false,
            },
            content: [
              {
                type: 'heading',
                attrs: {
                  textAlign: 'left',
                  level: 3,
                },
                content: [
                  {
                    type: 'text',
                    marks: [
                      {
                        type: 'textStyle',
                        attrs: {
                          fontFamily: null,
                          fontSize: null,
                          color: '',
                        },
                      },
                    ],
                    text: 'Skills ',
                  },
                ],
              },
            ],
          },
          {
            type: 'dBlock',
            attrs: {
              isCorrupted: false,
            },
            content: [
              {
                type: 'bulletList',
                attrs: {
                  tight: false,
                },
                content: [
                  {
                    type: 'listItem',
                    content: [
                      {
                        type: 'paragraph',
                        attrs: {
                          class: 'select-text pointer-events-auto',
                          textAlign: 'left',
                        },
                        content: [
                          {
                            type: 'text',
                            marks: [
                              {
                                type: 'textStyle',
                                attrs: {
                                  fontFamily: null,
                                  fontSize: null,
                                  color: '',
                                },
                              },
                            ],
                            text: 'Project Management | - Data Analysis | - Team Leadership',
                          },
                        ],
                      },
                    ],
                  },
                  {
                    type: 'listItem',
                    content: [
                      {
                        type: 'paragraph',
                        attrs: {
                          class: 'select-text pointer-events-auto',
                          textAlign: 'left',
                        },
                        content: [
                          {
                            type: 'text',
                            marks: [
                              {
                                type: 'textStyle',
                                attrs: {
                                  fontFamily: null,
                                  fontSize: null,
                                  color: '',
                                },
                              },
                            ],
                            text: '[Software/Tool 1] | - [Software/Tool 2] | - Fluent in [Language]',
                          },
                        ],
                      },
                    ],
                  },
                ],
              },
            ],
          },
          {
            type: 'dBlock',
            attrs: {
              isCorrupted: false,
            },
            content: [
              {
                type: 'heading',
                attrs: {
                  textAlign: 'left',
                  level: 3,
                },
                content: [
                  {
                    type: 'text',
                    marks: [
                      {
                        type: 'textStyle',
                        attrs: {
                          fontFamily: null,
                          fontSize: null,
                          color: '',
                        },
                      },
                    ],
                    text: 'Certifications',
                  },
                ],
              },
            ],
          },
          {
            type: 'dBlock',
            attrs: {
              isCorrupted: false,
            },
            content: [
              {
                type: 'bulletList',
                attrs: {
                  tight: false,
                },
                content: [
                  {
                    type: 'listItem',
                    content: [
                      {
                        type: 'paragraph',
                        attrs: {
                          class: 'select-text pointer-events-auto',
                          textAlign: 'left',
                        },
                        content: [
                          {
                            type: 'text',
                            marks: [
                              {
                                type: 'textStyle',
                                attrs: {
                                  fontFamily: null,
                                  fontSize: null,
                                  color: '',
                                },
                              },
                            ],
                            text: '[Certification Name], ',
                          },
                          {
                            type: 'text',
                            marks: [
                              {
                                type: 'textStyle',
                                attrs: {
                                  fontFamily: null,
                                  fontSize: null,
                                  color: '',
                                },
                              },
                              {
                                type: 'italic',
                              },
                            ],
                            text: 'Issuer',
                          },
                          {
                            type: 'text',
                            marks: [
                              {
                                type: 'textStyle',
                                attrs: {
                                  fontFamily: null,
                                  fontSize: null,
                                  color: '',
                                },
                              },
                            ],
                            text: ' (Year)',
                          },
                        ],
                      },
                    ],
                  },
                  {
                    type: 'listItem',
                    content: [
                      {
                        type: 'paragraph',
                        attrs: {
                          class: 'select-text pointer-events-auto',
                          textAlign: 'left',
                        },
                        content: [
                          {
                            type: 'text',
                            marks: [
                              {
                                type: 'textStyle',
                                attrs: {
                                  fontFamily: null,
                                  fontSize: null,
                                  color: '',
                                },
                              },
                            ],
                            text: '[Certification Name], ',
                          },
                          {
                            type: 'text',
                            marks: [
                              {
                                type: 'textStyle',
                                attrs: {
                                  fontFamily: null,
                                  fontSize: null,
                                  color: '',
                                },
                              },
                              {
                                type: 'italic',
                              },
                            ],
                            text: 'Issuer',
                          },
                          {
                            type: 'text',
                            marks: [
                              {
                                type: 'textStyle',
                                attrs: {
                                  fontFamily: null,
                                  fontSize: null,
                                  color: '',
                                },
                              },
                            ],
                            text: ' (Year)',
                          },
                        ],
                      },
                    ],
                  },
                ],
              },
            ],
          },
          {
            type: 'dBlock',
            attrs: {
              isCorrupted: false,
            },
            content: [
              {
                type: 'paragraph',
                attrs: {
                  class: null,
                  textAlign: 'left',
                },
              },
            ],
          },
        ],
      };
    }
    default:
      return null;
  }
};
